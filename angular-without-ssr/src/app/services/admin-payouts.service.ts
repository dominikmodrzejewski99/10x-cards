import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, throwError } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from './supabase-client.factory';

export interface PendingPayoutRow {
  partner_user_id: string;
  status: string;
  legal_name: string | null;
  bank_account_iban: string | null;
  pending_balance_grosz: number;
  period_earnings_grosz: number;
  period_billable_uses: number;
  period_concentration_flag: boolean;
  ready_for_payout: boolean;
  missing_kyc: boolean;
}

export interface PendingPayoutsResponse {
  period: string;
  min_payout_grosz: number;
  state: { csv_exported_at: string | null } | null;
  partners: PendingPayoutRow[];
}

export interface PayoutLedgerRow {
  id: number;
  partner_user_id: string;
  period: string;
  amount_grosz: number;
  legal_name_snapshot: string;
  bank_account_snapshot: string;
  status: 'pending' | 'exported' | 'paid' | 'failed';
  exported_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface ExportPayoutsResponse {
  period: string;
  frozen_at: string;
  newly_created_count: number;
  rows: PayoutLedgerRow[];
}

@Injectable({ providedIn: 'root' })
export class AdminPayoutsService {
  private supabase: SupabaseClient = inject(SupabaseClientFactory).getClient();

  public isAdmin(): Observable<boolean> {
    return from(this.supabase.rpc('is_partner_admin')).pipe(
      map((response: { data: unknown; error: unknown }) => {
        if (response.error) return false;
        return response.data === true;
      }),
      catchError(() => from([false]))
    );
  }

  public listPendingPayouts(period: string | null): Observable<PendingPayoutsResponse> {
    return from(
      this.supabase.rpc('admin_list_pending_payouts', { p_period: period })
    ).pipe(
      map((response: { data: unknown; error: unknown }) => {
        if (response.error) throw new Error((response.error as { message: string }).message);
        return response.data as PendingPayoutsResponse;
      }),
      catchError((err: unknown) => throwError(() => err))
    );
  }

  public exportPayouts(period: string): Observable<ExportPayoutsResponse> {
    return from(
      this.supabase.rpc('admin_export_payouts', { p_period: period })
    ).pipe(
      map((response: { data: unknown; error: unknown }) => {
        if (response.error) throw new Error((response.error as { message: string }).message);
        return response.data as ExportPayoutsResponse;
      }),
      catchError((err: unknown) => throwError(() => err))
    );
  }

  public markPaid(ledgerId: number, notes: string | null): Observable<void> {
    return from(
      this.supabase.rpc('admin_mark_payout_paid', { p_ledger_id: ledgerId, p_notes: notes })
    ).pipe(
      map((response: { data: unknown; error: unknown }) => {
        if (response.error) throw new Error((response.error as { message: string }).message);
      }),
      catchError((err: unknown) => throwError(() => err))
    );
  }

  /**
   * Generates a CSV file from ledger rows and triggers a browser download.
   * Columns match what a Polish bank's bulk-transfer import typically expects:
   * beneficiary name, IBAN, amount (as "12,34" — comma decimal), transfer title.
   */
  public downloadCsv(rows: PayoutLedgerRow[], period: string): void {
    const header: string[] = ['Imię i nazwisko', 'Numer konta', 'Kwota (PLN)', 'Tytuł przelewu'];
    const lines: string[] = [header.join(';')];

    for (const row of rows) {
      const amountPln: string = (row.amount_grosz / 100).toFixed(2).replace('.', ',');
      const title: string = `Wynagrodzenie partnerskie ${period}`;
      const cells: string[] = [
        this.csvEscape(row.legal_name_snapshot ?? ''),
        this.csvEscape(row.bank_account_snapshot ?? ''),
        this.csvEscape(amountPln),
        this.csvEscape(title),
      ];
      lines.push(cells.join(';'));
    }

    const csv: string = lines.join('\r\n');
    // UTF-8 BOM so Excel / banking software renders Polish characters correctly.
    const blob: Blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url: string = URL.createObjectURL(blob);
    const a: HTMLAnchorElement = document.createElement('a');
    a.href = url;
    a.download = `payouts_${period}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private csvEscape(value: string): string {
    // Semicolon separator + Excel-friendly quoting for cells containing
    // semicolons, quotes, or newlines.
    if (/[;"\r\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
