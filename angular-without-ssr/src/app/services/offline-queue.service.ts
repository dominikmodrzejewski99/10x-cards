import { Injectable, inject, signal, WritableSignal, Signal, computed } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from './supabase-client.factory';
import { ConnectivityService } from './connectivity.service';
import { LoggerService } from './logger.service';
import { Sm2Result } from './spaced-repetition.service';

export interface QueuedReviewOperation {
  id?: number;
  flashcard_id: number;
  user_id: string;
  review_data: Sm2Result;
  queued_at: string;
  retry_count: number;
}

const DB_NAME: string = '10x-cards-offline';
const DB_VERSION: number = 1;
const STORE_NAME: string = 'review-queue';
const MAX_RETRIES: number = 5;
const RETRY_INTERVAL_MS: number = 30_000;

@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private supabase: SupabaseClient = inject(SupabaseClientFactory).getClient();
  private connectivity: ConnectivityService = inject(ConnectivityService);
  private logger: LoggerService = inject(LoggerService);

  public pendingCountSignal: WritableSignal<number> = signal<number>(0);
  public syncingSignal: WritableSignal<boolean> = signal<boolean>(false);
  public hasPendingSignal: Signal<boolean> = computed<boolean>(() => this.pendingCountSignal() > 0);

  private db: IDBDatabase | null = null;
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private syncInProgress: boolean = false;

  constructor() {
    this.initDb().then(() => {
      this.refreshCount();
      this.processQueue();
    });

    // Watch connectivity changes — sync when back online
    // Using setInterval to poll the signal since we can't use effect() in a service constructor
    // without the experimental allowSignalWrites
    this.startConnectivityWatch();
  }

  public async enqueue(flashcardId: number, userId: string, reviewData: Sm2Result): Promise<void> {
    const db: IDBDatabase = await this.getDb();

    // Remove existing entry for the same flashcard (last-write-wins at queue level)
    await this.removeByFlashcardId(db, flashcardId);

    const operation: QueuedReviewOperation = {
      flashcard_id: flashcardId,
      user_id: userId,
      review_data: reviewData,
      queued_at: new Date().toISOString(),
      retry_count: 0
    };

    return new Promise<void>((resolve: () => void, reject: (reason: unknown) => void) => {
      const tx: IDBTransaction = db.transaction(STORE_NAME, 'readwrite');
      const store: IDBObjectStore = tx.objectStore(STORE_NAME);
      const request: IDBRequest = store.add(operation);

      request.onsuccess = (): void => {
        this.refreshCount();
        this.startRetryTimer();
        resolve();
      };
      request.onerror = (): void => {
        this.logger.error('OfflineQueueService.enqueue', request.error);
        reject(request.error);
      };
    });
  }

  public async processQueue(): Promise<void> {
    if (this.syncInProgress || !this.connectivity.onlineSignal()) {
      return;
    }

    const db: IDBDatabase = await this.getDb();
    const items: QueuedReviewOperation[] = await this.getAllPending(db);

    if (items.length === 0) {
      this.stopRetryTimer();
      return;
    }

    this.syncInProgress = true;
    this.syncingSignal.set(true);

    for (const item of items) {
      if (!this.connectivity.onlineSignal()) {
        break;
      }

      try {
        await this.syncToSupabase(item);
        await this.removeById(db, item.id!);
        this.logger.warn('OfflineQueueService', `Synced review for flashcard ${item.flashcard_id}`);
      } catch (error: unknown) {
        const newRetry: number = item.retry_count + 1;
        if (newRetry >= MAX_RETRIES) {
          this.logger.error('OfflineQueueService', `Dropping review for flashcard ${item.flashcard_id} after ${MAX_RETRIES} retries`);
          await this.removeById(db, item.id!);
        } else {
          await this.updateRetryCount(db, item.id!, newRetry);
        }
      }
    }

    this.syncInProgress = false;
    this.syncingSignal.set(false);
    await this.refreshCount();

    if (this.pendingCountSignal() === 0) {
      this.stopRetryTimer();
    }
  }

  public async getPendingCount(): Promise<number> {
    const db: IDBDatabase = await this.getDb();
    return new Promise<number>((resolve: (value: number) => void) => {
      const tx: IDBTransaction = db.transaction(STORE_NAME, 'readonly');
      const store: IDBObjectStore = tx.objectStore(STORE_NAME);
      const request: IDBRequest<number> = store.count();
      request.onsuccess = (): void => resolve(request.result);
      request.onerror = (): void => resolve(0);
    });
  }

  public async clearQueue(): Promise<void> {
    const db: IDBDatabase = await this.getDb();
    return new Promise<void>((resolve: () => void) => {
      const tx: IDBTransaction = db.transaction(STORE_NAME, 'readwrite');
      const store: IDBObjectStore = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = (): void => {
        this.pendingCountSignal.set(0);
        resolve();
      };
      tx.onerror = (): void => resolve();
    });
  }

  // --- Private helpers ---

  private async initDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise<IDBDatabase>((resolve: (db: IDBDatabase) => void, reject: (reason: unknown) => void) => {
      const request: IDBOpenDBRequest = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (): void => {
        const db: IDBDatabase = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store: IDBObjectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('flashcard_id', 'flashcard_id', { unique: false });
        }
      };

      request.onsuccess = (): void => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = (): void => {
        this.logger.error('OfflineQueueService.initDb', request.error);
        reject(request.error);
      };
    });
  }

  private async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return this.initDb();
  }

  private async getAllPending(db: IDBDatabase): Promise<QueuedReviewOperation[]> {
    return new Promise<QueuedReviewOperation[]>((resolve: (items: QueuedReviewOperation[]) => void) => {
      const tx: IDBTransaction = db.transaction(STORE_NAME, 'readonly');
      const store: IDBObjectStore = tx.objectStore(STORE_NAME);
      const request: IDBRequest<QueuedReviewOperation[]> = store.getAll();
      request.onsuccess = (): void => resolve(request.result);
      request.onerror = (): void => resolve([]);
    });
  }

  private async removeById(db: IDBDatabase, id: number): Promise<void> {
    return new Promise<void>((resolve: () => void) => {
      const tx: IDBTransaction = db.transaction(STORE_NAME, 'readwrite');
      const store: IDBObjectStore = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = (): void => resolve();
      tx.onerror = (): void => resolve();
    });
  }

  private async removeByFlashcardId(db: IDBDatabase, flashcardId: number): Promise<void> {
    return new Promise<void>((resolve: () => void) => {
      const tx: IDBTransaction = db.transaction(STORE_NAME, 'readwrite');
      const store: IDBObjectStore = tx.objectStore(STORE_NAME);
      const index: IDBIndex = store.index('flashcard_id');
      const request: IDBRequest<IDBValidKey[]> = index.getAllKeys(flashcardId);

      request.onsuccess = (): void => {
        const keys: IDBValidKey[] = request.result;
        for (const key of keys) {
          store.delete(key);
        }
        resolve();
      };
      request.onerror = (): void => resolve();
    });
  }

  private async updateRetryCount(db: IDBDatabase, id: number, retryCount: number): Promise<void> {
    return new Promise<void>((resolve: () => void) => {
      const tx: IDBTransaction = db.transaction(STORE_NAME, 'readwrite');
      const store: IDBObjectStore = tx.objectStore(STORE_NAME);
      const getRequest: IDBRequest<QueuedReviewOperation> = store.get(id);

      getRequest.onsuccess = (): void => {
        const item: QueuedReviewOperation = getRequest.result;
        if (item) {
          item.retry_count = retryCount;
          store.put(item);
        }
        resolve();
      };
      getRequest.onerror = (): void => resolve();
    });
  }

  private async syncToSupabase(item: QueuedReviewOperation): Promise<void> {
    const upsertData: Record<string, unknown> = {
      flashcard_id: item.flashcard_id,
      user_id: item.user_id,
      ease_factor: item.review_data.ease_factor,
      interval: item.review_data.interval,
      repetitions: item.review_data.repetitions,
      next_review_date: item.review_data.next_review_date,
      last_reviewed_at: item.queued_at,
      updated_at: item.queued_at
    };

    const response: { error: unknown } = await this.supabase
      .from('flashcard_reviews')
      .upsert(upsertData, { onConflict: 'flashcard_id,user_id' });

    if (response.error) {
      throw new Error(`Supabase sync error: ${(response.error as { message: string }).message}`);
    }
  }

  private async refreshCount(): Promise<void> {
    const count: number = await this.getPendingCount();
    this.pendingCountSignal.set(count);
  }

  private startRetryTimer(): void {
    if (this.retryTimer) return;
    this.retryTimer = setInterval(() => {
      if (this.connectivity.onlineSignal() && this.pendingCountSignal() > 0) {
        this.processQueue();
      }
    }, RETRY_INTERVAL_MS);
  }

  private stopRetryTimer(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private startConnectivityWatch(): void {
    let wasOffline: boolean = !navigator.onLine;
    setInterval(() => {
      const isOnline: boolean = this.connectivity.onlineSignal();
      if (isOnline && wasOffline) {
        this.processQueue();
      }
      wasOffline = !isOnline;
    }, 1000);
  }
}
