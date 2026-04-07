import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal, computed
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { ToastService } from '../../shared/services/toast.service';
import { FriendshipService } from '../../services/friendship.service';
import { LeaderboardEntryDTO, LeaderboardCategory } from '../../../types';

@Component({
  selector: 'app-friends-leaderboard',
  imports: [RouterModule, TranslocoDirective, SpinnerComponent],
  templateUrl: './friends-leaderboard.component.html',
  styleUrls: ['./friends-leaderboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FriendsLeaderboardComponent implements OnInit {
  private friendshipService = inject(FriendshipService);
  private toastService = inject(ToastService);
  private t: TranslocoService = inject(TranslocoService);

  readonly entries = signal<LeaderboardEntryDTO[]>([]);
  readonly loading = signal(true);
  readonly activeCategory = signal<LeaderboardCategory>('streak');

  readonly sortedEntries = computed(() => {
    const cat = this.activeCategory();
    const list = [...this.entries()];
    const key = cat === 'streak' ? 'current_streak'
      : cat === 'cards_this_week' ? 'cards_this_week'
      : 'total_cards_reviewed';
    return list.sort((a, b) => b[key] - a[key]);
  });

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  async loadLeaderboard(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.friendshipService.getLeaderboard();
      this.entries.set(data);
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('friends.toasts.leaderboardFailed')
      });
    } finally {
      this.loading.set(false);
    }
  }

  getValueForCategory(entry: LeaderboardEntryDTO): number {
    switch (this.activeCategory()) {
      case 'streak': return entry.current_streak;
      case 'cards_this_week': return entry.cards_this_week;
      case 'total_cards': return entry.total_cards_reviewed;
    }
  }
}
