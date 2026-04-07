import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ToastService } from '../../shared/services/toast.service';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { FriendshipService } from '../../services/friendship.service';
import { FriendDTO, FriendRequestDTO, SentRequestDTO } from '../../../types';

@Component({
  selector: 'app-friends-list',
  imports: [RouterModule, FormsModule, TranslocoDirective, SpinnerComponent],
  templateUrl: './friends-list.component.html',
  styleUrls: ['./friends-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FriendsListComponent implements OnInit {
  private friendshipService: FriendshipService = inject(FriendshipService);
  private toastService: ToastService = inject(ToastService);
  private t: TranslocoService = inject(TranslocoService);

  readonly friends = signal<FriendDTO[]>([]);
  readonly pendingRequests = signal<FriendRequestDTO[]>([]);
  readonly sentRequests = signal<SentRequestDTO[]>([]);
  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly emailInput = signal('');

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const [friends, pending, sent] = await Promise.all([
        this.friendshipService.getFriends(),
        this.friendshipService.getPendingRequests(),
        this.friendshipService.getSentRequests()
      ]);
      this.friends.set(friends);
      this.pendingRequests.set(pending);
      this.sentRequests.set(sent);
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('friends.toasts.loadFailed')
      });
    } finally {
      this.loading.set(false);
    }
  }

  async sendRequest(): Promise<void> {
    const email = this.emailInput().trim();
    if (!email) return;

    this.sending.set(true);
    try {
      await this.friendshipService.sendRequest(email);
      this.emailInput.set('');
      this.toastService.add({
        severity: 'success',
        summary: this.t.translate('toasts.sent'),
        detail: this.t.translate('friends.toasts.inviteSent')
      });
      const sent = await this.friendshipService.getSentRequests();
      this.sentRequests.set(sent);
    } catch (error: unknown) {
      const msg: string = (error as { message?: string })?.message || this.t.translate('friends.toasts.inviteSendFailed');
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: msg
      });
    } finally {
      this.sending.set(false);
    }
  }

  async acceptRequest(friendshipId: string): Promise<void> {
    try {
      await this.friendshipService.respondToRequest(friendshipId, true);
      this.toastService.add({ severity: 'success', summary: this.t.translate('toasts.accepted'), detail: this.t.translate('friends.toasts.friendAccepted') });
      await this.loadData();
    } catch {
      this.toastService.add({ severity: 'error', summary: this.t.translate('toasts.error'), detail: this.t.translate('friends.toasts.acceptFailed') });
    }
  }

  async rejectRequest(friendshipId: string): Promise<void> {
    try {
      await this.friendshipService.respondToRequest(friendshipId, false);
      this.pendingRequests.update(list => list.filter(r => r.friendship_id !== friendshipId));
    } catch {
      this.toastService.add({ severity: 'error', summary: this.t.translate('toasts.error'), detail: this.t.translate('friends.toasts.rejectFailed') });
    }
  }

  async removeFriend(friendshipId: string): Promise<void> {
    try {
      await this.friendshipService.removeFriend(friendshipId);
      this.friends.update(list => list.filter(f => f.friendship_id !== friendshipId));
      this.toastService.add({ severity: 'success', summary: this.t.translate('toasts.deleted'), detail: this.t.translate('friends.toasts.friendRemoved') });
    } catch {
      this.toastService.add({ severity: 'error', summary: this.t.translate('toasts.error'), detail: this.t.translate('friends.toasts.removeFailed') });
    }
  }

  async sendNudge(friendUserId: string): Promise<void> {
    try {
      await this.friendshipService.sendNudge(friendUserId);
      this.toastService.add({ severity: 'success', summary: this.t.translate('toasts.sent'), detail: this.t.translate('friends.toasts.nudgeSent') });
    } catch (error: unknown) {
      const msg: string = (error as { message?: string })?.message || this.t.translate('friends.toasts.nudgeSendFailed');
      this.toastService.add({ severity: 'warn', summary: this.t.translate('toasts.warning'), detail: msg });
    }
  }

  async cancelRequest(friendshipId: string): Promise<void> {
    try {
      await this.friendshipService.cancelRequest(friendshipId);
      this.sentRequests.update(list => list.filter(r => r.friendship_id !== friendshipId));
      this.toastService.add({ severity: 'success', summary: this.t.translate('toasts.cancelled'), detail: this.t.translate('friends.toasts.inviteCancelled') });
    } catch {
      this.toastService.add({ severity: 'error', summary: this.t.translate('toasts.error'), detail: this.t.translate('friends.toasts.cancelFailed') });
    }
  }

  getDaysInactive(lastStudyDate: string | null): number | null {
    if (!lastStudyDate) return null;
    const last = new Date(lastStudyDate);
    const now = new Date();
    return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  }
}
