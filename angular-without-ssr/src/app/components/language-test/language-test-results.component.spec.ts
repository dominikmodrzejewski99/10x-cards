import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { LanguageTestResultsComponent } from './language-test-results.component';
import { LanguageTestFacadeService } from '../../services/language-test-facade.service';
import { LanguageTestResultDTO } from '../../../types';

describe('LanguageTestResultsComponent', () => {
  let component: LanguageTestResultsComponent;
  let fixture: ComponentFixture<LanguageTestResultsComponent>;
  let routerMock: jasmine.SpyObj<Router>;
  let activatedRouteMock: { snapshot: { paramMap: { get: jasmine.Spy } } };

  const mockResult: LanguageTestResultDTO = {
    id: 1,
    user_id: 'user-1',
    level: 'b2-fce',
    total_score: 20,
    max_score: 30,
    percentage: 67,
    category_breakdown: {
      grammar: { correct: 8, total: 10 },
      vocabulary: { correct: 7, total: 10 },
      collocations: { correct: 5, total: 10 },
    },
    wrong_answers: [
      {
        questionId: 'q1',
        userAnswer: 'go',
        correctAnswer: 'went',
        front: 'She ___ to the store.',
        back: 'went — Past simple of go',
      },
    ],
    generated_set_id: null,
    completed_at: '2026-03-24T12:00:00Z',
    created_at: '2026-03-24T12:00:00Z',
    updated_at: '2026-03-24T12:00:00Z',
  };

  const facadeMock: Record<string, jasmine.Spy> = {
    testResultSignal: jasmine.createSpy('testResultSignal').and.returnValue(mockResult),
    resultLoadingSignal: jasmine.createSpy('resultLoadingSignal').and.returnValue(false),
    resultErrorSignal: jasmine.createSpy('resultErrorSignal').and.returnValue(null),
    generatingFlashcardsSignal: jasmine.createSpy('generatingFlashcardsSignal').and.returnValue(false),
    flashcardsGeneratedSignal: jasmine.createSpy('flashcardsGeneratedSignal').and.returnValue(false),
    categoriesSignal: jasmine.createSpy('categoriesSignal').and.returnValue([
      { name: 'grammar', correct: 8, total: 10, percentage: 80 },
      { name: 'vocabulary', correct: 7, total: 10, percentage: 70 },
      { name: 'collocations', correct: 5, total: 10, percentage: 50 },
    ]),
    loadResult: jasmine.createSpy('loadResult'),
    generateFlashcards: jasmine.createSpy('generateFlashcards'),
    getLevelLabel: jasmine.createSpy('getLevelLabel').and.returnValue('B2 First (FCE)'),
  };

  beforeEach(async () => {
    Object.values(facadeMock).forEach((spy: jasmine.Spy) => spy.calls.reset());

    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);
    activatedRouteMock = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.callFake(
            (key: string): string | null => (key === 'level' ? 'b2-fce' : null),
          ),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [
        LanguageTestResultsComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: LanguageTestFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageTestResultsComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call facade.loadResult for valid level', () => {
      fixture.detectChanges();

      expect(facadeMock['loadResult']).toHaveBeenCalledWith('b2-fce', undefined);
    });

    it('should redirect for invalid level', () => {
      activatedRouteMock.snapshot.paramMap.get.and.callFake(
        (key: string): string | null => (key === 'level' ? 'invalid' : null),
      );

      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/language-test']);
    });
  });

  describe('generateFlashcards', () => {
    it('should delegate to facade.generateFlashcards()', () => {
      component.generateFlashcards();

      expect(facadeMock['generateFlashcards']).toHaveBeenCalled();
    });
  });

  describe('getLevelLabel', () => {
    it('should delegate to facade.getLevelLabel()', () => {
      const label: string = component.getLevelLabel();

      expect(facadeMock['getLevelLabel']).toHaveBeenCalled();
      expect(label).toBe('B2 First (FCE)');
    });
  });
});
