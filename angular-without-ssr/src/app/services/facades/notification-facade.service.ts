import { Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { NotificationDTO } from '../../../types';
import { NotificationService } from '../api/notification.service';
import { FriendshipService } from '../api/friendship.service';
import { ToastService } from '../../shared/services/toast.service';

@Injectable({ providedIn: 'root' })
export class NotificationFacadeService {
  private readonly notificationService: NotificationService = inject(NotificationService);
  private readonly friendshipService: FriendshipService = inject(FriendshipService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly t: TranslocoService = inject(TranslocoService);

  private readonly _unreadCount = signal<number>(0);
  private readonly _notifications = signal<NotificationDTO[]>([]);
  private readonly _panelOpen = signal<boolean>(false);
  private readonly _loading = signal<boolean>(false);
  private readonly _navigationTarget = signal<{ route: string[]; queryParams?: Record<string, string> } | null>(null);

  public readonly unreadCountSignal = this._unreadCount.asReadonly();
  public readonly notificationsSignal = this._notifications.asReadonly();
  public readonly panelOpenSignal = this._panelOpen.asReadonly();
  public readonly loadingSignal = this._loading.asReadonly();
  public readonly navigationTargetSignal = this._navigationTarget.asReadonly();

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  public init(): void {
    this.loadUnreadCount();
    this.pollInterval = setInterval(() => this.loadUnreadCount(), 30000);
  }

  public destroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  public async loadUnreadCount(): Promise<void> {
    try {
      const count = await this.notificationService.getUnreadCount();
      this._unreadCount.set(count);
    } catch {
      // Silently fail — bell is non-critical
    }
  }

  public async togglePanel(): Promise<void> {
    if (this._panelOpen()) {
      this._panelOpen.set(false);
      return;
    }

    this._panelOpen.set(true);
    this._loading.set(true);
    try {
      const notifs = await this.notificationService.getNotifications(10);
      this._notifications.set(notifs);
    } catch {
      this._notifications.set([]);
    } finally {
      this._loading.set(false);
    }
  }

  public async markAllAsRead(): Promise<void> {
    try {
      await this.notificationService.markAllAsRead();
      this._unreadCount.set(0);
      this._notifications.update(list => list.map(n => ({ ...n, read: true })));
    } catch {
      // Silent
    }
  }

  public async onNotificationClick(notification: NotificationDTO): Promise<void> {
    if (!notification.read) {
      try {
        await this.notificationService.markAsRead(notification.id);
        this._notifications.update(list =>
          list.map(n => n.id === notification.id ? { ...n, read: true } : n),
        );
        this._unreadCount.update(c => Math.max(0, c - 1));
      } catch {
        // Silent
      }
    }

    this._panelOpen.set(false);

    if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
      this._navigationTarget.set({ route: ['/friends'] });
    }
  }

  public async acceptDeckShare(notification: NotificationDTO): Promise<void> {
    const deckShareId = notification.data['deck_share_id'] as string;
    if (!deckShareId) return;

    try {
      const newSetId = await this.friendshipService.acceptDeckShare(deckShareId);
      await this.notificationService.markAsRead(notification.id);
      this._notifications.update(list =>
        list.map(n => n.id === notification.id ? { ...n, read: true } : n),
      );
      this._unreadCount.update(c => Math.max(0, c - 1));
      this._panelOpen.set(false);
      this._navigationTarget.set({
        route: ['/sets', String(newSetId)],
        queryParams: { shared: 'true' },
      });
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('notifications.acceptFailed'),
      });
    }
  }

  public closePanel(): void {
    this._panelOpen.set(false);
  }

  public clearNavigationTarget(): void {
    this._navigationTarget.set(null);
  }

  public getNotificationIcon(type: string): string {
    switch (type) {
      case 'friend_request': return 'pi-user-plus';
      case 'friend_accepted': return 'pi-check-circle';
      case 'nudge': return 'pi-bell';
      case 'deck_shared': return 'pi-share-alt';
      default: return 'pi-info-circle';
    }
  }
}
