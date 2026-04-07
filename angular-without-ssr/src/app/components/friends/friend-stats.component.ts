import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { ToastService } from '../../shared/services/toast.service';
import { FriendshipService } from '../../services/friendship.service';
import { UserPreferencesService } from '../../services/user-preferences.service';
import { FriendStatsDTO, UserPreferencesDTO } from '../../../types';

@Component({
  selector: 'app-friend-stats',
  imports: [RouterModule, TranslocoDirective, SpinnerComponent],
  templateUrl: './friend-stats.component.html',
  styleUrls: ['./friend-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FriendStatsComponent implements OnInit {
  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private friendshipService: FriendshipService = inject(FriendshipService);
  private userPreferencesService: UserPreferencesService = inject(UserPreferencesService);
  private toastService: ToastService = inject(ToastService);
  private t: TranslocoService = inject(TranslocoService);

  readonly friendStats = signal<FriendStatsDTO | null>(null);
  readonly myStats = signal<UserPreferencesDTO | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('userId');
    if (!userId) {
      this.router.navigate(['/friends']);
      return;
    }
    this.loadStats(userId);
  }

  private async loadStats(userId: string): Promise<void> {
    this.loading.set(true);
    try {
      const [friendData, myPrefs] = await Promise.all([
        this.friendshipService.getFriendStats(userId),
        new Promise<UserPreferencesDTO>((resolve, reject) => {
          this.userPreferencesService.getPreferences().subscribe({
            next: resolve,
            error: reject
          });
        })
      ]);
      this.friendStats.set(friendData);
      this.myStats.set(myPrefs);
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('friends.toasts.statsFailed')
      });
      this.router.navigate(['/friends']);
    } finally {
      this.loading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/friends']);
  }
}
