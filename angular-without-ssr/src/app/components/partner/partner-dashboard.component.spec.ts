import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal, WritableSignal } from '@angular/core';

import { PartnerDashboardComponent } from './partner-dashboard.component';
import { PartnerFacadeService } from '../../services/facades/partner-facade.service';
import { PartnerProfileDTO, PartnerMonthlyStatsDTO, PartnerConfigDTO } from '../../../types';

describe('PartnerDashboardComponent', () => {
  let component: PartnerDashboardComponent;
  let fixture: ComponentFixture<PartnerDashboardComponent>;
  let facadeMock: jasmine.SpyObj<PartnerFacadeService>;
  let currentMonthStatsSignal: WritableSignal<PartnerMonthlyStatsDTO | null>;

  const mockStats: PartnerMonthlyStatsDTO = {
    author_id: 'user-1',
    period: '2026-04-01',
    billable_uses: 50,
    unique_learners: 10,
    gross_earnings_grosz: 5000,
    capped_earnings_grosz: 4500,
    accrued_to_balance_grosz: 4500,
    concentration_top_user_pct: null,
    concentration_flag: false,
    computed_at: '2026-04-14T00:00:00Z',
  };

  const mockConfig: PartnerConfigDTO = {
    price_per_use_grosz: 100,
    partner_share_percent: 50,
    min_payout_grosz: 10000,
    monthly_global_budget_grosz: 1000000,
    per_partner_monthly_cap_grosz: 100000,
  };

  beforeEach(async () => {
    currentMonthStatsSignal = signal<PartnerMonthlyStatsDTO | null>(mockStats);

    facadeMock = jasmine.createSpyObj<PartnerFacadeService>('PartnerFacadeService', [
      'init', 'submitOnboarding', 'formatPln', 'formatPeriod',
    ], {
      profileSignal: signal<PartnerProfileDTO | null>(null),
      statsSignal: signal<PartnerMonthlyStatsDTO[]>([mockStats]),
      configSignal: signal<PartnerConfigDTO | null>(mockConfig),
      loadingSignal: signal<boolean>(false),
      submittingSignal: signal<boolean>(false),
      errorSignal: signal<string | null>(null),
      currentMonthStatsSignal,
      lifetimeEarningsSignal: signal<number>(50000),
      pendingBalanceSignal: signal<number>(4500),
      readyForPayoutSignal: signal<boolean>(false),
    });

    facadeMock.formatPln.and.callFake((grosz: number) =>
      (grosz / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })
    );

    await TestBed.configureTestingModule({
      imports: [PartnerDashboardComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: PartnerFacadeService, useValue: facadeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PartnerDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return current month earnings from facade stats', () => {
    fixture.detectChanges();
    expect((component as any).currentMonthEarnings()).toBe(4500);
  });

  it('should return current month billable uses', () => {
    fixture.detectChanges();
    expect((component as any).currentMonthUses()).toBe(50);
  });

  it('should return null concentration flag when not flagged', () => {
    fixture.detectChanges();
    expect((component as any).currentMonthFlag()).toBeNull();
  });

  it('should return min payout label using facade.formatPln', () => {
    fixture.detectChanges();
    const label = (component as any).minPayoutLabel();
    expect(facadeMock.formatPln).toHaveBeenCalledWith(10000);
    expect(label).toBeTruthy();
  });

  it('should return 0 earnings when current month stats are null', () => {
    currentMonthStatsSignal.set(null);
    fixture.detectChanges();
    expect((component as any).currentMonthEarnings()).toBe(0);
  });
});
