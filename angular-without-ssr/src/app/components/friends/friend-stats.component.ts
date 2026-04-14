import {
  Component, ChangeDetectionStrategy, OnInit, inject, effect
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { FriendsFacadeService } from '../../services/facades/friends-facade.service';

@Component({
  selector: 'app-friend-stats',
  imports: [RouterModule, TranslocoDirective, SpinnerComponent],
  templateUrl: './friend-stats.component.html',
  styleUrls: ['./friend-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FriendStatsComponent implements OnInit {
  readonly facade: FriendsFacadeService = inject(FriendsFacadeService);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);

  constructor() {
    effect(() => {
      if (this.facade.statsErrorSignal()) {
        this.router.navigate(['/friends']);
      }
    });
  }

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('userId');
    if (!userId) {
      this.router.navigate(['/friends']);
      return;
    }
    this.facade.loadFriendStats(userId);
  }

  goBack(): void {
    this.router.navigate(['/friends']);
  }
}
