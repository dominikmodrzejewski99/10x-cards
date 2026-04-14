import {
  Component, ChangeDetectionStrategy, inject, input, output, effect
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { FriendsFacadeService } from '../../services/facades/friends-facade.service';

@Component({
  selector: 'app-share-to-friend-dialog',
  imports: [DialogComponent, TranslocoDirective, SpinnerComponent],
  templateUrl: './share-to-friend-dialog.component.html',
  styleUrls: ['./share-to-friend-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShareToFriendDialogComponent {
  readonly facade: FriendsFacadeService = inject(FriendsFacadeService);

  setId = input.required<number>();
  visible = input.required<boolean>();
  visibleChange = output<boolean>();

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.facade.loadShareFriends();
      }
    });
  }

  shareToFriend(friendUserId: string): void {
    this.facade.shareToFriend(this.setId(), friendUserId);
  }

  isShared(friendUserId: string): boolean {
    return this.facade.isShared(friendUserId);
  }

  close(): void {
    this.facade.resetShareState();
    this.visibleChange.emit(false);
  }
}
