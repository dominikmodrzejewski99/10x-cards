import { Injectable, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { TranslocoService } from '@jsverse/transloco';
import { PartnerApiService } from '../api/partner-api.service';
import { SupabaseClientFactory } from '../infrastructure/supabase-client.factory';
import { ToastService } from '../../shared/services/toast.service';
import { LoggerService } from '../infrastructure/logger.service';
import {
  PartnerProfileDTO,
  PartnerMonthlyStatsDTO,
  PartnerConfigDTO,
  PartnerOnboardingCommand,
} from '../../../types';

/**
 * Facade for the Partner Program.
 *
 * Single source of truth for the partner dashboard and onboarding flow.
 * Keeps components free of API plumbing and auth.uid() concerns.
 */
@Injectable({ providedIn: 'root' })
export class PartnerFacadeService {
  private readonly api: PartnerApiService = inject(PartnerApiService);
  private readonly supabase: SupabaseClient = inject(SupabaseClientFactory).getClient();
  private readonly toast: ToastService = inject(ToastService);
  private readonly t: TranslocoService = inject(TranslocoService);
  private readonly logger: LoggerService = inject(LoggerService);

  private readonly _profile: WritableSignal<PartnerProfileDTO | null> = signal<PartnerProfileDTO | null>(null);
  private readonly _stats: WritableSignal<PartnerMonthlyStatsDTO[]> = signal<PartnerMonthlyStatsDTO[]>([]);
  private readonly _config: WritableSignal<PartnerConfigDTO | null> = signal<PartnerConfigDTO | null>(null);
  private readonly _loading: WritableSignal<boolean> = signal<boolean>(true);
  private readonly _submitting: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _error: WritableSignal<string | null> = signal<string | null>(null);

  public readonly profileSignal: Signal<PartnerProfileDTO | null> = this._profile.asReadonly();
  public readonly statsSignal: Signal<PartnerMonthlyStatsDTO[]> = this._stats.asReadonly();
  public readonly configSignal: Signal<PartnerConfigDTO | null> = this._config.asReadonly();
  public readonly loadingSignal: Signal<boolean> = this._loading.asReadonly();
  public readonly submittingSignal: Signal<boolean> = this._submitting.asReadonly();
  public readonly errorSignal: Signal<string | null> = this._error.asReadonly();

  /** Current (most recent) month's stats, or null if this month has no activity yet. */
  public readonly currentMonthStatsSignal: Signal<PartnerMonthlyStatsDTO | null> = computed(() => {
    const all: PartnerMonthlyStatsDTO[] = this._stats();
    const periodKey: string = this.currentPeriodKey();
    return all.find((s: PartnerMonthlyStatsDTO) => s.period.startsWith(periodKey)) ?? null;
  });

  /** Total earnings to date, across all months (in grosz). */
  public readonly lifetimeEarningsSignal: Signal<number> = computed(() => {
    return this._profile()?.lifetime_earnings_grosz ?? 0;
  });

  /** Balance waiting to be paid out (in grosz). */
  public readonly pendingBalanceSignal: Signal<number> = computed(() => {
    return this._profile()?.pending_balance_grosz ?? 0;
  });

  /** True iff the pending balance has reached the minimum payout threshold. */
  public readonly readyForPayoutSignal: Signal<boolean> = computed(() => {
    const balance: number = this.pendingBalanceSignal();
    const threshold: number = this._config()?.min_payout_grosz ?? Infinity;
    return balance >= threshold;
  });

  public init(): void {
    this._loading.set(true);
    this._error.set(null);

    this.supabase.auth.getSession().then((response: { data: { session: { user: { id: string } } | null } }) => {
      const userId: string | undefined = response.data.session?.user?.id;
      if (!userId) {
        this._error.set(this.t.translate('partner.errors.notLoggedIn'));
        this._loading.set(false);
        return;
      }

      this.api.getConfig().subscribe({
        next: (cfg: PartnerConfigDTO) => this._config.set(cfg),
        error: (err: unknown) => this.logger.error('PartnerFacadeService.init', err),
      });

      this.api.getProfile(userId).subscribe({
        next: (profile: PartnerProfileDTO | null) => {
          this._profile.set(profile);
          this._loading.set(false);
        },
        error: () => { this._loading.set(false); },
      });

      this.api.getMonthlyStats(userId).subscribe({
        next: (stats: PartnerMonthlyStatsDTO[]) => this._stats.set(stats),
        error: () => { /* Non-critical: stats are supplementary. */ },
      });
    });
  }

  public submitOnboarding(command: PartnerOnboardingCommand): void {
    this._submitting.set(true);
    this._error.set(null);

    this.supabase.auth.getSession().then((response: { data: { session: { user: { id: string } } | null } }) => {
      const userId: string | undefined = response.data.session?.user?.id;
      if (!userId) {
        this._error.set(this.t.translate('partner.errors.notLoggedIn'));
        this._submitting.set(false);
        return;
      }

      this.api.submitOnboarding(userId, command).subscribe({
        next: (profile: PartnerProfileDTO | null) => {
          this._profile.set(profile);
          this._submitting.set(false);
          this.toast.add({
            severity: 'success',
            summary: this.t.translate('partner.toasts.welcomeTitle'),
            detail: this.t.translate('partner.toasts.welcomeDetail'),
          });
        },
        error: (err: unknown) => {
          const msg: string = err instanceof Error ? err.message : this.t.translate('partner.errors.saveFailed');
          this._error.set(msg);
          this._submitting.set(false);
        },
      });
    });
  }

  /** Format grosz → "12,34 zł" (Polish locale). */
  public formatPln(grosz: number): string {
    const pln: number = grosz / 100;
    return pln.toLocaleString('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    });
  }

  /** Format period date → "kwiecień 2026". */
  public formatPeriod(periodIso: string): string {
    const d: Date = new Date(periodIso);
    return d.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long' });
  }

  private currentPeriodKey(): string {
    const d: Date = new Date();
    const year: number = d.getUTCFullYear();
    const month: string = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
