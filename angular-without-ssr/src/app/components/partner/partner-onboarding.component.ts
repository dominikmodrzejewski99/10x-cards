import { Component, inject, Signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PartnerFacadeService } from '../../services/facades/partner-facade.service';
import { PartnerOnboardingCommand } from '../../../types';

/**
 * Onboarding form for the Partner Program.
 *
 * Collects KYC data required to generate PIT-11 at year-end plus the IBAN
 * for payouts. License acceptance is captured as a checkbox against a
 * specific license_version string — if the license is later updated, all
 * partners must re-accept.
 *
 * ⚠️ Before enabling this in production, Domino must provide a finalized
 * PDF of the licensing agreement (consulted with a lawyer). The
 * LICENSE_VERSION constant below points at the version of that PDF. Bump
 * it whenever the document changes — the check at read time will force a
 * re-acceptance.
 */
const LICENSE_VERSION = 'v0-draft-2026-04-13';

interface OnboardingErrors {
  legal_name: boolean;
  pesel: boolean;
  address_line1: boolean;
  postal_code: boolean;
  city: boolean;
  tax_office: boolean;
  bank_account_iban: boolean;
}

@Component({
  selector: 'app-partner-onboarding',
  imports: [FormsModule],
  templateUrl: './partner-onboarding.component.html',
  styleUrls: ['./partner-onboarding.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerOnboardingComponent {
  protected readonly facade: PartnerFacadeService = inject(PartnerFacadeService);
  protected readonly licenseVersion: string = LICENSE_VERSION;

  // Form model. Using a plain object rather than FormGroup to keep the
  // surface area small — 7 fields, no dynamic validation, no cross-field rules.
  protected form: {
    legal_name: string;
    pesel: string;
    address_line1: string;
    postal_code: string;
    city: string;
    tax_office: string;
    bank_account_iban: string;
  } = {
    legal_name: '',
    pesel: '',
    address_line1: '',
    postal_code: '',
    city: '',
    tax_office: '',
    bank_account_iban: '',
  };

  protected licenseAccepted: boolean = false;

  protected errors: Signal<OnboardingErrors> = computed<OnboardingErrors>(() => {
    return this.validate(this.form);
  });

  protected isValid(): boolean {
    const errs: OnboardingErrors = this.errors();
    const hasErr: boolean = Object.values(errs).some((v: boolean) => v);
    return !hasErr && this.licenseAccepted;
  }

  protected minPayout(): number {
    return this.facade.configSignal()?.min_payout_grosz ?? 10000;
  }

  protected submit(): void {
    if (!this.isValid()) return;

    const command: PartnerOnboardingCommand = {
      legal_name: this.form.legal_name.trim(),
      pesel: this.form.pesel.trim(),
      address_line1: this.form.address_line1.trim(),
      postal_code: this.form.postal_code.trim(),
      city: this.form.city.trim(),
      tax_office: this.form.tax_office.trim(),
      // Strip spaces from IBAN so DB CHECK passes regardless of how user typed it.
      bank_account_iban: this.form.bank_account_iban.replace(/\s+/g, ''),
      license_version: this.licenseVersion,
      license_accepted: true,
    };

    this.facade.submitOnboarding(command);
  }

  private validate(form: typeof this.form): OnboardingErrors {
    const iban: string = form.bank_account_iban.replace(/\s+/g, '');
    return {
      legal_name: form.legal_name.trim().length < 3,
      pesel: !/^[0-9]{11}$/.test(form.pesel.trim()),
      address_line1: form.address_line1.trim().length < 3,
      postal_code: !/^[0-9]{2}-[0-9]{3}$/.test(form.postal_code.trim()),
      city: form.city.trim().length < 2,
      tax_office: form.tax_office.trim().length < 3,
      bank_account_iban: !/^PL[0-9]{26}$/.test(iban),
    };
  }
}
