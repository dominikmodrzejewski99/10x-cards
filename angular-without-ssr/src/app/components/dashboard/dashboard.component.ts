import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject
} from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { ReviewReminderComponent } from '../../shared/components/review-reminder/review-reminder.component';
import { LanguageTestWidgetComponent } from '../language-test/language-test-widget.component';
import { AuthStore } from '../../auth/store';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { TranslocoDirective } from '@jsverse/transloco';
import { DashboardFacadeService } from '../../services/dashboard-facade.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterModule, ReviewReminderComponent, LanguageTestWidgetComponent, NgxSkeletonLoaderModule, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  public readonly facade: DashboardFacadeService = inject(DashboardFacadeService);
  private readonly router: Router = inject(Router);
  private readonly authStore = inject(AuthStore);

  public readonly isAnonymous = this.authStore.isAnonymous;

  public ngOnInit(): void {
    this.facade.loadStreaks();
    this.facade.loadData();
  }

  public onReminderStudy(): void {
    this.facade.dismissReminder();
    this.router.navigate(['/study']);
  }

  public onReminderDismiss(): void {
    this.facade.dismissReminder();
  }
}
