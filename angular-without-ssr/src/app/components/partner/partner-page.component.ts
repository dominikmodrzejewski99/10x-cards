import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { PartnerFacadeService } from '../../services/partner-facade.service';
import { PartnerDashboardComponent } from './partner-dashboard.component';
import { PartnerOnboardingComponent } from './partner-onboarding.component';

/**
 * Router for the partner program UI. Dispatches between onboarding and
 * dashboard based on partner_profile.status.
 *
 * A user with no partner_profile row (or status='none') sees the onboarding
 * form. Once the form is submitted (status='active') they land on the
 * dashboard on next visit.
 *
 * Edge case: a user with status='none' may still have accrued pending
 * balance (the aggregator creates profiles with pending_balance > 0 even
 * for users who never onboarded). The onboarding component shows a banner
 * with the outstanding balance in that case.
 */
@Component({
  selector: 'app-partner-page',
  imports: [PartnerDashboardComponent, PartnerOnboardingComponent],
  templateUrl: './partner-page.component.html',
  styleUrls: ['./partner-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerPageComponent {
  protected readonly facade: PartnerFacadeService = inject(PartnerFacadeService);

  constructor() {
    // Facade initialization runs eagerly from the constructor. No lifecycle
    // hook needed — `inject()` works in constructors and the facade owns
    // all async data loading / subscription lifecycles internally.
    this.facade.init();
  }
}
