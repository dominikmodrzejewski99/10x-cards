import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { AdminPayoutsComponent } from './admin-payouts.component';
import {
  AdminPayoutsService,
  PendingPayoutsResponse,
  PendingPayoutRow,
} from '../../services/api/admin-payouts.service';

describe('AdminPayoutsComponent', () => {
  let component: AdminPayoutsComponent;
  let fixture: ComponentFixture<AdminPayoutsComponent>;
  let apiMock: jasmine.SpyObj<AdminPayoutsService>;

  const mockPartner: PendingPayoutRow = {
    partner_user_id: 'user-1',
    status: 'active',
    legal_name: 'Jan Kowalski',
    bank_account_iban: 'PL12345678901234567890123456',
    pending_balance_grosz: 50000,
    period_earnings_grosz: 30000,
    period_billable_uses: 120,
    period_concentration_flag: false,
    ready_for_payout: true,
    missing_kyc: false,
  };

  const mockResponse: PendingPayoutsResponse = {
    period: '2026-03-01',
    min_payout_grosz: 10000,
    state: null,
    partners: [mockPartner],
  };

  beforeEach(async () => {
    apiMock = jasmine.createSpyObj<AdminPayoutsService>('AdminPayoutsService', [
      'isAdmin', 'listPendingPayouts', 'exportPayouts', 'downloadCsv',
    ]);

    apiMock.isAdmin.and.returnValue(of(true));
    apiMock.listPendingPayouts.and.returnValue(of(mockResponse));

    await TestBed.configureTestingModule({
      imports: [
        AdminPayoutsComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          preloadLangs: true,
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: AdminPayoutsService, useValue: apiMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPayoutsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should check admin access and load data on construction', () => {
    fixture.detectChanges();

    expect(apiMock.isAdmin).toHaveBeenCalled();
    expect(apiMock.listPendingPayouts).toHaveBeenCalled();
  });

  it('should set accessDenied when user is not admin', () => {
    apiMock.isAdmin.and.returnValue(of(false));

    const fix = TestBed.createComponent(AdminPayoutsComponent);
    fix.detectChanges();

    expect((fix.componentInstance as any)['_accessDenied']()).toBe(true);
  });

  it('should set accessDenied on isAdmin error', () => {
    apiMock.isAdmin.and.returnValue(throwError(() => new Error('Network error')));

    const fix = TestBed.createComponent(AdminPayoutsComponent);
    fix.detectChanges();

    expect((fix.componentInstance as any)['_accessDenied']()).toBe(true);
  });

  it('should format PLN correctly', () => {
    expect((component as any).formatPln(12345)).toContain('123,45');
  });
});
