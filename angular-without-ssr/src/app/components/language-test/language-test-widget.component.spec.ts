import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { LanguageTestWidgetComponent } from './language-test-widget.component';
import { LanguageTestFacadeService } from '../../services/facades/language-test-facade.service';

describe('LanguageTestWidgetComponent', () => {
  let component: LanguageTestWidgetComponent;
  let fixture: ComponentFixture<LanguageTestWidgetComponent>;

  const facadeMock: Record<string, jasmine.Spy> = {
    latestResultSignal: jasmine.createSpy('latestResultSignal').and.returnValue(null),
    widgetLoadingSignal: jasmine.createSpy('widgetLoadingSignal').and.returnValue(true),
    loadLatestResult: jasmine.createSpy('loadLatestResult'),
    getWidgetLevelLabel: jasmine.createSpy('getWidgetLevelLabel').and.callFake((level: string) => {
      if (level === 'b1') return 'B1';
      if (level === 'b2-fce') return 'B2 FCE';
      return 'C1 CAE';
    }),
    getRelativeDate: jasmine.createSpy('getRelativeDate').and.callFake((dateStr: string) => {
      const now = new Date();
      const then = new Date(dateStr);
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thenMidnight = new Date(then.getFullYear(), then.getMonth(), then.getDate());
      const days = Math.round((todayMidnight.getTime() - thenMidnight.getTime()) / 86400000);
      if (days === 0) return 'Dzisiaj';
      if (days === 1) return 'Wczoraj';
      return `${days} dni temu`;
    }),
  };

  beforeEach(async () => {
    Object.values(facadeMock).forEach((spy: jasmine.Spy) => spy.calls.reset());
    facadeMock['latestResultSignal'].and.returnValue(null);
    facadeMock['widgetLoadingSignal'].and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [
        LanguageTestWidgetComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideRouter([]),
        { provide: LanguageTestFacadeService, useValue: facadeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageTestWidgetComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call facade.loadLatestResult()', () => {
      fixture.detectChanges();

      expect(facadeMock['loadLatestResult']).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state', () => {
    it('should start with loading true', () => {
      expect(component.loading()).toBeTrue();
    });
  });

  describe('getLevelLabel', () => {
    it('should return "B1" for b1 level', () => {
      expect(component.getLevelLabel('b1')).toBe('B1');
    });

    it('should return "B2 FCE" for b2-fce level', () => {
      expect(component.getLevelLabel('b2-fce')).toBe('B2 FCE');
    });

    it('should return "C1 CAE" for c1-cae level', () => {
      expect(component.getLevelLabel('c1-cae')).toBe('C1 CAE');
    });
  });

  describe('getRelativeDate', () => {
    it('should return "Dzisiaj" for today', () => {
      const today: string = new Date().toISOString();

      expect(component.getRelativeDate(today)).toBe('Dzisiaj');
    });

    it('should return "Wczoraj" for yesterday', () => {
      const yesterday: Date = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      expect(component.getRelativeDate(yesterday.toISOString())).toBe('Wczoraj');
    });

    it('should return "X dni temu" for older dates', () => {
      const threeDaysAgo: Date = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      expect(component.getRelativeDate(threeDaysAgo.toISOString())).toBe('3 dni temu');
    });
  });
});
