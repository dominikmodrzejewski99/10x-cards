import { Component, ChangeDetectionStrategy, inject, signal, Signal, WritableSignal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import {
  AdminPayoutsService,
  PendingPayoutsResponse,
  PendingPayoutRow,
  ExportPayoutsResponse,
} from '../../services/api/admin-payouts.service';

/**
 * Admin-only page for managing monthly payouts.
 *
 * Workflow:
 * 1. Select the billing period (defaults to prior month).
 * 2. See list of partners with pending balances, flagged for fraud review,
 *    or missing KYC.
 * 3. Click "Export CSV" → server freezes the period (monthly_payout_state.
 *    csv_exported_at), creates payout_ledger entries, zeros pending_balance
 *    for eligible partners, and returns the ledger.
 * 4. Browser downloads a CSV formatted for bulk-transfer import at a Polish
 *    bank (semicolon-separated, UTF-8 BOM, comma decimal for PLN).
 * 5. After manually executing the transfers, admin marks each ledger row
 *    as 'paid' (not implemented yet — phase 2).
 *
 * Access: the is_partner_admin() RPC decides. Users whose id is not in
 * partner_config.admin_user_ids see "access denied".
 */
@Component({
  selector: 'app-admin-payouts',
  imports: [FormsModule, TranslocoDirective],
  templateUrl: './admin-payouts.component.html',
  styleUrls: ['./admin-payouts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPayoutsComponent {
  private readonly api: AdminPayoutsService = inject(AdminPayoutsService);
  private readonly t: TranslocoService = inject(TranslocoService);

  private readonly _data: WritableSignal<PendingPayoutsResponse | null> = signal<PendingPayoutsResponse | null>(null);
  private readonly _loading: WritableSignal<boolean> = signal<boolean>(true);
  private readonly _error: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _accessDenied: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _exporting: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _exportMessage: WritableSignal<string | null> = signal<string | null>(null);

  protected readonly data: Signal<PendingPayoutsResponse | null> = this._data.asReadonly();
  protected readonly loading: Signal<boolean> = this._loading.asReadonly();
  protected readonly error: Signal<string | null> = this._error.asReadonly();
  protected readonly accessDenied: Signal<boolean> = this._accessDenied.asReadonly();
  protected readonly exporting: Signal<boolean> = this._exporting.asReadonly();
  protected readonly exportMessage: Signal<string | null> = this._exportMessage.asReadonly();

  /** Defaults to the 1st of the previous month — that's the period we'd pay this month. */
  protected period: string = this.defaultPeriod();

  protected readonly readyCount: Signal<number> = computed(() => {
    return (this._data()?.partners ?? []).filter((p: PendingPayoutRow) => p.ready_for_payout).length;
  });

  protected readonly readySumGrosz: Signal<number> = computed(() => {
    return (this._data()?.partners ?? [])
      .filter((p: PendingPayoutRow) => p.ready_for_payout)
      .reduce((sum: number, p: PendingPayoutRow) => sum + p.pending_balance_grosz, 0);
  });

  constructor() {
    // Gate: check admin access before loading data. Non-admins see a single
    // "access denied" message and nothing else loads.
    this.api.isAdmin().subscribe({
      next: (isAdmin: boolean) => {
        if (!isAdmin) {
          this._accessDenied.set(true);
          this._loading.set(false);
          return;
        }
        this.reload();
      },
      error: () => {
        this._accessDenied.set(true);
        this._loading.set(false);
      },
    });
  }

  protected reload(): void {
    this._loading.set(true);
    this._error.set(null);
    this._exportMessage.set(null);

    this.api.listPendingPayouts(this.period).subscribe({
      next: (response: PendingPayoutsResponse) => {
        this._data.set(response);
        this._loading.set(false);
      },
      error: (err: unknown) => {
        const msg: string = err instanceof Error ? err.message : this.t.translate('admin.payouts.loadFailed');
        this._error.set(msg);
        this._loading.set(false);
      },
    });
  }

  protected exportAndDownload(): void {
    this._exporting.set(true);
    this._exportMessage.set(null);

    this.api.exportPayouts(this.period).subscribe({
      next: (response: ExportPayoutsResponse) => {
        this.api.downloadCsv(response.rows, this.period);
        const exportedCount: number = response.newly_created_count;
        this._exportMessage.set(
          exportedCount > 0
            ? this.t.translate('admin.payouts.exportSuccessNew', { count: exportedCount })
            : this.t.translate('admin.payouts.exportSuccessExisting')
        );
        this._exporting.set(false);
        // Refresh to show the frozen banner.
        this.reload();
      },
      error: (err: unknown) => {
        const msg: string = err instanceof Error ? err.message : this.t.translate('admin.payouts.exportFailed');
        this._error.set(msg);
        this._exporting.set(false);
      },
    });
  }

  protected formatPln(grosz: number): string {
    return (grosz / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleString('pl-PL');
  }

  private defaultPeriod(): string {
    const d: Date = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  }
}
