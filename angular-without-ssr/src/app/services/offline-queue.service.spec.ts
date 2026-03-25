import { TestBed } from '@angular/core/testing';
import { OfflineQueueService } from './offline-queue.service';
import { SupabaseClientFactory } from './supabase-client.factory';
import { ConnectivityService } from './connectivity.service';
import { signal } from '@angular/core';
import { Sm2Result } from './spaced-repetition.service';

describe('OfflineQueueService', () => {
  let service: OfflineQueueService;
  let mockConnectivity: { onlineSignal: ReturnType<typeof signal<boolean>>; ngOnDestroy: jasmine.Spy };
  let mockSupabase: { from: jasmine.Spy; auth: { getSession: jasmine.Spy } };

  const testReviewData: Sm2Result = {
    ease_factor: 2.5,
    interval: 1,
    repetitions: 1,
    next_review_date: '2026-04-01T00:00:00Z'
  };

  beforeEach(() => {
    mockConnectivity = {
      onlineSignal: signal<boolean>(true),
      ngOnDestroy: jasmine.createSpy('ngOnDestroy')
    };

    mockSupabase = {
      from: jasmine.createSpy('from').and.returnValue({
        upsert: jasmine.createSpy('upsert').and.returnValue(
          Promise.resolve({ error: null })
        )
      }),
      auth: {
        getSession: jasmine.createSpy('getSession').and.returnValue(
          Promise.resolve({ data: { session: { user: { id: 'user-1' } } }, error: null })
        )
      }
    };

    TestBed.configureTestingModule({
      providers: [
        OfflineQueueService,
        { provide: ConnectivityService, useValue: mockConnectivity },
        { provide: SupabaseClientFactory, useValue: { getClient: () => mockSupabase } }
      ]
    });

    service = TestBed.inject(OfflineQueueService);
  });

  afterEach(async () => {
    await service.clearQueue();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with 0 pending count', (done: DoneFn) => {
    // Wait for init
    setTimeout(() => {
      expect(service.pendingCountSignal()).toBe(0);
      expect(service.hasPendingSignal()).toBeFalse();
      done();
    }, 100);
  });

  it('should enqueue a review operation and update pending count', async () => {
    mockConnectivity.onlineSignal.set(false);
    await service.enqueue(42, 'user-1', testReviewData);

    const count: number = await service.getPendingCount();
    expect(count).toBe(1);
    expect(service.pendingCountSignal()).toBe(1);
    expect(service.hasPendingSignal()).toBeTrue();
  });

  it('should replace existing entry for same flashcard_id (last-write-wins)', async () => {
    mockConnectivity.onlineSignal.set(false);

    const firstData: Sm2Result = { ...testReviewData, interval: 1 };
    const secondData: Sm2Result = { ...testReviewData, interval: 6 };

    await service.enqueue(42, 'user-1', firstData);
    await service.enqueue(42, 'user-1', secondData);

    const count: number = await service.getPendingCount();
    expect(count).toBe(1);
  });

  it('should keep separate entries for different flashcard_ids', async () => {
    mockConnectivity.onlineSignal.set(false);

    await service.enqueue(42, 'user-1', testReviewData);
    await service.enqueue(77, 'user-1', testReviewData);

    const count: number = await service.getPendingCount();
    expect(count).toBe(2);
  });

  it('should clear the queue', async () => {
    mockConnectivity.onlineSignal.set(false);
    await service.enqueue(42, 'user-1', testReviewData);
    await service.clearQueue();

    const count: number = await service.getPendingCount();
    expect(count).toBe(0);
    expect(service.pendingCountSignal()).toBe(0);
  });

  it('should process queue and sync to Supabase when online', async () => {
    // Enqueue while "offline"
    mockConnectivity.onlineSignal.set(false);
    await service.enqueue(42, 'user-1', testReviewData);
    expect(await service.getPendingCount()).toBe(1);

    // Go online and process
    mockConnectivity.onlineSignal.set(true);
    await service.processQueue();

    expect(mockSupabase.from).toHaveBeenCalledWith('flashcard_reviews');
    expect(await service.getPendingCount()).toBe(0);
  });

  it('should not process queue when offline', async () => {
    mockConnectivity.onlineSignal.set(false);
    await service.enqueue(42, 'user-1', testReviewData);

    await service.processQueue();

    // Still pending because we're offline
    expect(await service.getPendingCount()).toBe(1);
  });

  it('should not start syncing signal when offline', async () => {
    mockConnectivity.onlineSignal.set(false);
    await service.enqueue(42, 'user-1', testReviewData);
    await service.processQueue();

    expect(service.syncingSignal()).toBeFalse();
  });
});
