import {
  Component, ChangeDetectionStrategy, OnInit, inject
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { FriendsFacadeService } from '../../services/facades/friends-facade.service';

@Component({
  selector: 'app-friends-leaderboard',
  imports: [RouterModule, TranslocoDirective, SpinnerComponent],
  templateUrl: './friends-leaderboard.component.html',
  styleUrls: ['./friends-leaderboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FriendsLeaderboardComponent implements OnInit {
  readonly facade: FriendsFacadeService = inject(FriendsFacadeService);

  ngOnInit(): void {
    this.facade.loadLeaderboard();
  }
}
