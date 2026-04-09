import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { DashboardComponent } from './dashboard.component';
import { DashboardFacadeService, CardBreakdown } from '../../services/dashboard-facade.service';
import { FlashcardSetDTO } from '../../../types';
import { LanguageTestResultsService } from '../../services/language-test-results.service';
import { of } from 'rxjs';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  let facadeMock: jasmine.SpyObj<DashboardFacadeService>;
  let routerMock: jasmine.SpyObj<Router>;
  let languageTestResultsServiceMock: jasmine.SpyObj<LanguageTestResultsService>;

  const mockSets: FlashcardSetDTO[] = [
    {
      id: 1, user_id: 'user-1', name: 'English', description: null, tags: [],
      is_public: false, copy_count: 0, published_at: null,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z'
    }
  ];

  const mockBreakdown: CardBreakdown = {
    newCards: 1, learning: 0, reviewing: 0, mastered: 1, due: 1, total: 2
  };

  beforeEach(async () => {
    facadeMock = jasmine.createSpyObj<DashboardFacadeService>('DashboardFacadeService', [
      'loadData', 'loadStreaks', 'dismissReminder', 'formatDate', 'formatFullDate', 'barWidth'
    ], {
      loadingSignal: signal<boolean>(false),
      errorMessageSignal: signal<string | null>(null),
      setsSignal: signal<FlashcardSetDTO[]>(mockSets),
      nextReviewDateSignal: signal<string | null>('2026-04-01T10:00:00Z'),
      breakdownSignal: signal<CardBreakdown>(mockBreakdown),
      reminderVisibleSignal: signal<boolean>(false),
      reminderDueCountSignal: signal<number>(0),
      currentStreakSignal: signal<number>(3),
      longestStreakSignal: signal<number>(10),
      totalSessionsSignal: signal<number>(25),
      totalCardsReviewedSignal: signal<number>(150),
      studiedTodaySignal: signal<boolean>(true),
      totalSetsSignal: signal<number>(1),
      totalCardsSignal: signal<number>(2),
      dueCountSignal: signal<number>(1),
      uptodatePercentSignal: signal<number>(50),
      greetingSignal: signal<string>('Cześć')
    });

    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);
    languageTestResultsServiceMock = jasmine.createSpyObj<LanguageTestResultsService>(
      'LanguageTestResultsService', ['getLatestResult']
    );
    languageTestResultsServiceMock.getLatestResult.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' } })],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: DashboardFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: {} },
        { provide: LanguageTestResultsService, useValue: languageTestResultsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call facade.loadStreaks and facade.loadData', () => {
      fixture.detectChanges();

      expect(facadeMock.loadStreaks).toHaveBeenCalled();
      expect(facadeMock.loadData).toHaveBeenCalled();
    });
  });

  describe('reminder', () => {
    it('should navigate to study on reminder study action', () => {
      fixture.detectChanges();

      component.onReminderStudy();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/study']);
      expect(facadeMock.dismissReminder).toHaveBeenCalled();
    });

    it('should dismiss reminder', () => {
      fixture.detectChanges();

      component.onReminderDismiss();

      expect(facadeMock.dismissReminder).toHaveBeenCalled();
    });
  });
});
