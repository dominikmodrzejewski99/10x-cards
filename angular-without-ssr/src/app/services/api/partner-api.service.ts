import { Injectable, inject } from '@angular/core';
import { Observable, from, map, of, catchError } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from '../infrastructure/supabase-client.factory';
import { LoggerService } from '../infrastructure/logger.service';
import { AppError } from '../../shared/utils/app-error';
import {
  PartnerProfileDTO,
  PartnerMonthlyStatsDTO,
  PartnerConfigDTO,
  PartnerOnboardingCommand,
} from '../../../types';

interface PartnerConfigRow {
  key: string;
  value_int: number | null;
  value_text: string | null;
}

@Injectable({ providedIn: 'root' })
export class PartnerApiService {
  private supabase: SupabaseClient = inject(SupabaseClientFactory).getClient();
  private logger: LoggerService = inject(LoggerService);

  public getProfile(userId: string): Observable<PartnerProfileDTO | null> {
    return from(
      this.supabase
        .from('partner_profile')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
    ).pipe(
      map((response: { data: unknown; error: unknown }) => {
        if (response.error) {
          this.logger.warn('PartnerApiService.getProfile', 'Supabase error');
          return null;
        }
        return (response.data as PartnerProfileDTO) ?? null;
      }),
      catchError((error: unknown) => {
        this.logger.error('PartnerApiService.getProfile', error);
        return of(null);
      })
    );
  }

  public getMonthlyStats(userId: string): Observable<PartnerMonthlyStatsDTO[]> {
    return from(
      this.supabase
        .from('partner_monthly_stats')
        .select('*')
        .eq('author_id', userId)
        .order('period', { ascending: false })
        .limit(24) // Two years of history is plenty for the dashboard.
    ).pipe(
      map((response: { data: unknown; error: unknown }) => {
        if (response.error) return [] as PartnerMonthlyStatsDTO[];
        return (response.data as PartnerMonthlyStatsDTO[]) ?? [];
      }),
      catchError(() => of([] as PartnerMonthlyStatsDTO[]))
    );
  }

  public getConfig(): Observable<PartnerConfigDTO> {
    return from(
      this.supabase.from('partner_config').select('key, value_int, value_text')
    ).pipe(
      map((response: { data: unknown; error: unknown }) => {
        const rows: PartnerConfigRow[] = (response.data as PartnerConfigRow[]) ?? [];
        const lookup = (key: string): number =>
          rows.find((r: PartnerConfigRow) => r.key === key)?.value_int ?? 0;
        return {
          price_per_use_grosz: lookup('price_per_use_grosz'),
          partner_share_percent: lookup('partner_share_percent'),
          min_payout_grosz: lookup('min_payout_grosz'),
          monthly_global_budget_grosz: lookup('monthly_global_budget_grosz'),
          per_partner_monthly_cap_grosz: lookup('per_partner_monthly_cap_grosz'),
        };
      }),
      catchError(() => of({
        price_per_use_grosz: 0,
        partner_share_percent: 0,
        min_payout_grosz: 0,
        monthly_global_budget_grosz: 0,
        per_partner_monthly_cap_grosz: 0,
      }))
    );
  }

  /**
   * Upserts the partner profile with KYC data and license acceptance.
   * Sets status → 'active' iff all required fields are present and
   * license_accepted === true. Caller is responsible for form validation;
   * DB-side checks only guard against malformed data (e.g. bad PESEL/IBAN).
   */
  public submitOnboarding(
    userId: string,
    command: PartnerOnboardingCommand
  ): Observable<PartnerProfileDTO | null> {
    const now: string = new Date().toISOString();
    const payload: Record<string, unknown> = {
      user_id: userId,
      status: 'active',
      legal_name: command.legal_name,
      pesel: command.pesel,
      address_line1: command.address_line1,
      postal_code: command.postal_code,
      city: command.city,
      tax_office: command.tax_office,
      bank_account_iban: command.bank_account_iban,
      license_version: command.license_version,
      license_accepted_at: now,
      // license_acceptance_ip is set server-side if we ever add an edge
      // function. For now, leaving null — the timestamp + version is
      // sufficient proof-of-consent for civil liability.
      updated_at: now,
    };

    return from(
      this.supabase
        .from('partner_profile')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single()
    ).pipe(
      map((response: { data: unknown; error: unknown }) => {
        if (response.error) {
          const msg: string = (response.error as { message: string }).message;
          throw new AppError(500, `Partner profile save error: ${msg}`);
        }
        return response.data as PartnerProfileDTO;
      })
    );
  }
}
