import {
  Component, ChangeDetectionStrategy, OnInit, inject
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { SpinnerComponent } from '../../shared/components/spinner/spinner.component';
import { FriendsFacadeService } from '../../services/facades/friends-facade.service';

@Component({
  selector: 'app-friends-list',
  imports: [RouterModule, FormsModule, TranslocoDirective, SpinnerComponent],
  templateUrl: './friends-list.component.html',
  styleUrls: ['./friends-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FriendsListComponent implements OnInit {
  readonly facade: FriendsFacadeService = inject(FriendsFacadeService);

  ngOnInit(): void {
    this.facade.loadFriendsList();
  }
}
