import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal, DestroyRef
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FriendshipService } from '../../services/friendship.service';
import { UserPreferencesService } from '../../services/user-preferences.service';
import { FriendStatsDTO, UserPreferencesDTO } from '../../../types';

@Component({
  selector: 'app-friend-stats',
  imports: [RouterModule, TranslocoDirective, ProgressSpinnerModule, ToastModule],
  providers: [MessageService],
  templateUrl: './friend-stats.component.html',
  styleUrls: ['./friend-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FriendStatsComponent implements OnInit {
  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private friendshipService: FriendshipService = inject(FriendshipService);
  private userPreferencesService: UserPreferencesService = inject(UserPreferencesService);
  private messageService: MessageService = inject(MessageService);

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
      this.messageService.add({
        severity: 'error',
        summary: 'Błąd',
        detail: 'Nie udało się załadować statystyk.'
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
