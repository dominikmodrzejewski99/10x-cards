import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';

import { PartnerPageComponent } from './partner-page.component';
import { PartnerFacadeService } from '../../services/facades/partner-facade.service';
import { PartnerProfileDTO, PartnerMonthlyStatsDTO, PartnerConfigDTO } from '../../../types';

describe('PartnerPageComponent', () => {
  let component: PartnerPageComponent;
  let fixture: ComponentFixture<PartnerPageComponent>;
  let facadeMock: jasmine.SpyObj<PartnerFacadeService>;

  beforeEach(async () => {
    facadeMock = jasmine.createSpyObj<PartnerFacadeService>('PartnerFacadeService', [
      'init', 'submitOnboarding', 'formatPln', 'formatPeriod',
    ], {
      profileSignal: signal<PartnerProfileDTO | null>(null),
      statsSignal: signal<PartnerMonthlyStatsDTO[]>([]),
      configSignal: signal<PartnerConfigDTO | null>(null),
      loadingSignal: signal<boolean>(false),
      submittingSignal: signal<boolean>(false),
      errorSignal: signal<string | null>(null),
      currentMonthStatsSignal: signal<PartnerMonthlyStatsDTO | null>(null),
      lifetimeEarningsSignal: signal<number>(0),
      pendingBalanceSignal: signal<number>(0),
      readyForPayoutSignal: signal<boolean>(false),
    });

    await TestBed.configureTestingModule({
      imports: [PartnerPageComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: PartnerFacadeService, useValue: facadeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PartnerPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call facade.init() on construction', () => {
    expect(facadeMock.init).toHaveBeenCalled();
  });

  it('should expose facade for template binding', () => {
    expect((component as any).facade).toBe(facadeMock);
  });
});
