import {
  Component, ChangeDetectionStrategy, inject, signal, input, output, effect
} from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { ToastService } from '../../shared/services/toast.service';
import { FriendshipService } from '../../services/friendship.service';
import { FriendDTO } from '../../../types';

@Component({
  selector: 'app-share-to-friend-dialog',
  imports: [DialogComponent, TranslocoDirective, SpinnerComponent],
  templateUrl: './share-to-friend-dialog.component.html',
  styleUrls: ['./share-to-friend-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShareToFriendDialogComponent {
  private friendshipService = inject(FriendshipService);
  private toastService = inject(ToastService);
  private t: TranslocoService = inject(TranslocoService);

  setId = input.required<number>();
  visible = input.required<boolean>();
  visibleChange = output<boolean>();

  readonly friends = signal<FriendDTO[]>([]);
  readonly loading = signal(false);
  readonly sharedTo = signal<Set<string>>(new Set());
  readonly sharing = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.loadFriends();
      }
    });
  }

  private async loadFriends(): Promise<void> {
    this.loading.set(true);
    try {
      const friends = await this.friendshipService.getFriends();
      this.friends.set(friends);
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('friends.toasts.loadFriendsFailed')
      });
    } finally {
      this.loading.set(false);
    }
  }

  async shareToFriend(friendUserId: string): Promise<void> {
    this.sharing.set(friendUserId);
    try {
      await this.friendshipService.shareDeckToFriend(this.setId(), friendUserId);
      this.sharedTo.update(set => new Set(set).add(friendUserId));
      this.toastService.add({
        severity: 'success',
        summary: this.t.translate('toasts.shared'),
        detail: this.t.translate('friends.toasts.setShared')
      });
    } catch (error: unknown) {
      const msg: string = (error as { message?: string })?.message || this.t.translate('friends.toasts.shareFailed');
      this.toastService.add({ severity: 'error', summary: this.t.translate('toasts.error'), detail: msg });
    } finally {
      this.sharing.set(null);
    }
  }

  isShared(friendUserId: string): boolean {
    return this.sharedTo().has(friendUserId);
  }

  close(): void {
    this.visibleChange.emit(false);
  }
}
