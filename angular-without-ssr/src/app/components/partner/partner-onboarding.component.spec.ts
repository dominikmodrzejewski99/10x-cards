import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PartnerOnboardingComponent } from './partner-onboarding.component';
import { PartnerFacadeService } from '../../services/facades/partner-facade.service';
import { PartnerProfileDTO, PartnerMonthlyStatsDTO, PartnerConfigDTO } from '../../../types';

describe('PartnerOnboardingComponent', () => {
  let component: PartnerOnboardingComponent;
  let fixture: ComponentFixture<PartnerOnboardingComponent>;
  let facadeMock: jasmine.SpyObj<PartnerFacadeService>;
  // Access protected members via casting
  let cmp: any;

  const mockConfig: PartnerConfigDTO = {
    price_per_use_grosz: 100,
    partner_share_percent: 50,
    min_payout_grosz: 10000,
    monthly_global_budget_grosz: 1000000,
    per_partner_monthly_cap_grosz: 100000,
  };

  beforeEach(async () => {
    facadeMock = jasmine.createSpyObj<PartnerFacadeService>('PartnerFacadeService', [
      'init', 'submitOnboarding', 'formatPln', 'formatPeriod',
    ], {
      profileSignal: signal<PartnerProfileDTO | null>(null),
      statsSignal: signal<PartnerMonthlyStatsDTO[]>([]),
      configSignal: signal<PartnerConfigDTO | null>(mockConfig),
      loadingSignal: signal<boolean>(false),
      submittingSignal: signal<boolean>(false),
      errorSignal: signal<string | null>(null),
      currentMonthStatsSignal: signal<PartnerMonthlyStatsDTO | null>(null),
      lifetimeEarningsSignal: signal<number>(0),
      pendingBalanceSignal: signal<number>(0),
      readyForPayoutSignal: signal<boolean>(false),
    });

    await TestBed.configureTestingModule({
      imports: [PartnerOnboardingComponent, FormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: PartnerFacadeService, useValue: facadeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PartnerOnboardingComponent);
    component = fixture.componentInstance;
    cmp = component as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be invalid when form is empty', () => {
    fixture.detectChanges();
    expect(cmp.isValid()).toBe(false);
  });

  it('should be invalid when license is not accepted', () => {
    cmp.form = {
      legal_name: 'Jan Kowalski',
      pesel: '12345678901',
      address_line1: 'ul. Testowa 1',
      postal_code: '00-001',
      city: 'Warszawa',
      tax_office: 'US Warszawa',
      bank_account_iban: 'PL12345678901234567890123456',
    };
    cmp.licenseAccepted = false;
    fixture.detectChanges();

    expect(cmp.isValid()).toBe(false);
  });

  it('should be valid when all fields are correct and license accepted', () => {
    cmp.form = {
      legal_name: 'Jan Kowalski',
      pesel: '12345678901',
      address_line1: 'ul. Testowa 1',
      postal_code: '00-001',
      city: 'Warszawa',
      tax_office: 'US Warszawa',
      bank_account_iban: 'PL12345678901234567890123456',
    };
    cmp.licenseAccepted = true;
    fixture.detectChanges();

    expect(cmp.isValid()).toBe(true);
  });

  it('should call facade.submitOnboarding on valid submit', () => {
    cmp.form = {
      legal_name: 'Jan Kowalski',
      pesel: '12345678901',
      address_line1: 'ul. Testowa 1',
      postal_code: '00-001',
      city: 'Warszawa',
      tax_office: 'US Warszawa',
      bank_account_iban: 'PL12345678901234567890123456',
    };
    cmp.licenseAccepted = true;
    fixture.detectChanges();

    cmp.submit();

    expect(facadeMock.submitOnboarding).toHaveBeenCalledWith(
      jasmine.objectContaining({
        legal_name: 'Jan Kowalski',
        pesel: '12345678901',
        bank_account_iban: 'PL12345678901234567890123456',
        license_accepted: true,
      })
    );
  });

  it('should not call facade.submitOnboarding when form is invalid', () => {
    fixture.detectChanges();

    cmp.submit();

    expect(facadeMock.submitOnboarding).not.toHaveBeenCalled();
  });

  it('should return min payout from facade config', () => {
    fixture.detectChanges();
    expect(cmp.minPayout()).toBe(10000);
  });
});
