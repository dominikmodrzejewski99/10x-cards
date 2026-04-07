import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal, DestroyRef
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { ToastService } from '../../shared/services/toast.service';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { FriendshipService } from '../../services/friendship.service';
import { NotificationService } from '../../services/notification.service';
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
  private notificationService: NotificationService = inject(NotificationService);
  private toastService: ToastService = inject(ToastService);

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
        summary: 'Błąd',
        detail: 'Nie udało się załadować danych znajomych.'
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
        summary: 'Wysłano',
        detail: 'Zaproszenie zostało wysłane!'
      });
      this.friendshipService.getSentRequests().then(sent => this.sentRequests.set(sent));
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message || 'Nie udało się wysłać zaproszenia.';
      this.toastService.add({
        severity: 'error',
        summary: 'Błąd',
        detail: msg
      });
    } finally {
      this.sending.set(false);
    }
  }

  async acceptRequest(friendshipId: string): Promise<void> {
    try {
      await this.friendshipService.respondToRequest(friendshipId, true);
      this.toastService.add({ severity: 'success', summary: 'Zaakceptowano', detail: 'Dodano do znajomych!' });
      await this.loadData();
    } catch {
      this.toastService.add({ severity: 'error', summary: 'Błąd', detail: 'Nie udało się zaakceptować.' });
    }
  }

  async rejectRequest(friendshipId: string): Promise<void> {
    try {
      await this.friendshipService.respondToRequest(friendshipId, false);
      this.pendingRequests.update(list => list.filter(r => r.friendship_id !== friendshipId));
    } catch {
      this.toastService.add({ severity: 'error', summary: 'Błąd', detail: 'Nie udało się odrzucić.' });
    }
  }

  async removeFriend(friendshipId: string): Promise<void> {
    try {
      await this.friendshipService.removeFriend(friendshipId);
      this.friends.update(list => list.filter(f => f.friendship_id !== friendshipId));
      this.toastService.add({ severity: 'success', summary: 'Usunięto', detail: 'Usunięto ze znajomych.' });
    } catch {
      this.toastService.add({ severity: 'error', summary: 'Błąd', detail: 'Nie udało się usunąć.' });
    }
  }

  async sendNudge(friendUserId: string): Promise<void> {
    try {
      await this.friendshipService.sendNudge(friendUserId);
      this.toastService.add({ severity: 'success', summary: 'Wysłano', detail: 'Przypomnienie wysłane!' });
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message || 'Nie udało się wysłać przypomnienia.';
      this.toastService.add({ severity: 'warn', summary: 'Uwaga', detail: msg });
    }
  }

  async cancelRequest(friendshipId: string): Promise<void> {
    try {
      await this.friendshipService.cancelRequest(friendshipId);
      this.sentRequests.update(list => list.filter(r => r.friendship_id !== friendshipId));
      this.toastService.add({ severity: 'success', summary: 'Anulowano', detail: 'Zaproszenie anulowane.' });
    } catch {
      this.toastService.add({ severity: 'error', summary: 'Błąd', detail: 'Nie udało się anulować zaproszenia.' });
    }
  }

  getDaysInactive(lastStudyDate: string | null): number | null {
    if (!lastStudyDate) return null;
    const last = new Date(lastStudyDate);
    const now = new Date();
    return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  }
}
