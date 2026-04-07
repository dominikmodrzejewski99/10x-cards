import {
  Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal, ElementRef
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { NgClass } from '@angular/common';
import { NotificationService } from '../../../services/notification.service';
import { FriendshipService } from '../../../services/friendship.service';
import { ToastService } from '../../services/toast.service';
import { NotificationDTO } from '../../../../types';

@Component({
  selector: 'app-notification-bell',
  imports: [TranslocoDirective, NgClass],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)'
  }
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private notificationService: NotificationService = inject(NotificationService);
  private friendshipService: FriendshipService = inject(FriendshipService);
  private toastService: ToastService = inject(ToastService);
  private t: TranslocoService = inject(TranslocoService);
  private router: Router = inject(Router);
  private elementRef: ElementRef = inject(ElementRef);

  readonly unreadCount = signal(0);
  readonly notifications = signal<NotificationDTO[]>([]);
  readonly panelOpen = signal(false);
  readonly loading = signal(false);

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.loadUnreadCount();
    this.pollInterval = setInterval(() => this.loadUnreadCount(), 30000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  async loadUnreadCount(): Promise<void> {
    try {
      const count = await this.notificationService.getUnreadCount();
      this.unreadCount.set(count);
    } catch {
      // Silently fail — bell is non-critical
    }
  }

  async togglePanel(): Promise<void> {
    if (this.panelOpen()) {
      this.panelOpen.set(false);
      return;
    }

    this.panelOpen.set(true);
    this.loading.set(true);
    try {
      const notifs = await this.notificationService.getNotifications(10);
      this.notifications.set(notifs);
    } catch {
      this.notifications.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await this.notificationService.markAllAsRead();
      this.unreadCount.set(0);
      this.notifications.update(list => list.map(n => ({ ...n, read: true })));
    } catch {
      // Silent
    }
  }

  async onNotificationClick(notification: NotificationDTO): Promise<void> {
    if (!notification.read) {
      try {
        await this.notificationService.markAsRead(notification.id);
        this.notifications.update(list =>
          list.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        this.unreadCount.update(c => Math.max(0, c - 1));
      } catch {
        // Silent
      }
    }

    this.panelOpen.set(false);

    if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
      this.router.navigate(['/friends']);
    }
  }

  async acceptDeckShare(notification: NotificationDTO, event: Event): Promise<void> {
    event.stopPropagation();
    const deckShareId = notification.data['deck_share_id'] as string;
    if (!deckShareId) return;

    try {
      const newSetId = await this.friendshipService.acceptDeckShare(deckShareId);
      await this.notificationService.markAsRead(notification.id);
      this.notifications.update(list =>
        list.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      this.unreadCount.update(c => Math.max(0, c - 1));
      this.panelOpen.set(false);
      this.router.navigate(['/sets', newSetId], { queryParams: { shared: 'true' } });
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('notifications.acceptFailed')
      });
    }
  }

  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.panelOpen.set(false);
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'friend_request': return 'pi-user-plus';
      case 'friend_accepted': return 'pi-check-circle';
      case 'nudge': return 'pi-bell';
      case 'deck_shared': return 'pi-share-alt';
      default: return 'pi-info-circle';
    }
  }
}
