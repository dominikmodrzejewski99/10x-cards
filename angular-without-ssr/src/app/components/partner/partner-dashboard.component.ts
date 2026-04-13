import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { PartnerFacadeService } from '../../services/partner-facade.service';
import { PartnerMonthlyStatsDTO } from '../../../types';

/**
 * Dashboard for active partners — shows earnings, payout status, and
 * per-month history.
 *
 * Intentionally spartan: no charts, no sparklines, no animations. The
 * audience is authors who want to know "how much do I have and when will
 * I get paid." A static table answers that better than a dashboard.
 */
@Component({
  selector: 'app-partner-dashboard',
  templateUrl: './partner-dashboard.component.html',
  styleUrls: ['./partner-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerDashboardComponent {
  protected readonly facade: PartnerFacadeService = inject(PartnerFacadeService);

  protected currentMonthEarnings(): number {
    const stat: PartnerMonthlyStatsDTO | null = this.facade.currentMonthStatsSignal();
    return stat?.capped_earnings_grosz ?? 0;
  }

  protected currentMonthUses(): number {
    const stat: PartnerMonthlyStatsDTO | null = this.facade.currentMonthStatsSignal();
    return stat?.billable_uses ?? 0;
  }

  protected currentMonthFlag(): number | null {
    const stat: PartnerMonthlyStatsDTO | null = this.facade.currentMonthStatsSignal();
    if (!stat?.concentration_flag) return null;
    return Math.round(stat.concentration_top_user_pct ?? 0);
  }

  protected minPayoutLabel(): string {
    const cfg = this.facade.configSignal();
    return this.facade.formatPln(cfg?.min_payout_grosz ?? 10000);
  }
}
