import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { LanguageTestResultsComponent } from './language-test-results.component';
import { LanguageTestResultsService } from '../../services/language-test-results.service';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { FlashcardApiService } from '../../services/flashcard-api.service';
import { LanguageTestResultDTO, FlashcardSetDTO, FlashcardDTO } from '../../../types';

describe('LanguageTestResultsComponent', () => {
  let component: LanguageTestResultsComponent;
  let fixture: ComponentFixture<LanguageTestResultsComponent>;

  let resultsServiceMock: jasmine.SpyObj<LanguageTestResultsService>;
  let setApiMock: jasmine.SpyObj<FlashcardSetApiService>;
  let flashcardApiMock: jasmine.SpyObj<FlashcardApiService>;
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
      collocations: { correct: 5, total: 10 }
    },
    wrong_answers: [
      {
        questionId: 'q1',
        userAnswer: 'go',
        correctAnswer: 'went',
        front: 'She ___ to the store.',
        back: 'went — Past simple of go'
      },
      {
        questionId: 'q2',
        userAnswer: 'make',
        correctAnswer: 'do',
        front: 'I need to ___ homework.',
        back: 'do — do homework is a collocation'
      }
    ],
    generated_set_id: null,
    completed_at: '2026-03-24T12:00:00Z',
    created_at: '2026-03-24T12:00:00Z',
    updated_at: '2026-03-24T12:00:00Z'
  };

  const mockSet: FlashcardSetDTO = {
    id: 50,
    user_id: 'user-1',
    name: 'Błędy B2 FCE — 2026-03-24',
    description: 'Fiszki z błędnych odpowiedzi',
    created_at: '',
    updated_at: ''
  };

  const mockFlashcards: FlashcardDTO[] = [
    {
      id: 100,
      front: 'She ___ to the store.',
      back: 'went — Past simple of go',
      front_image_url: null,
      back_audio_url: null,
      front_language: 'en',
      back_language: 'pl',
      source: 'test',
      created_at: '',
      updated_at: '',
      user_id: 'user-1',
      generation_id: null,
      set_id: 50,
      position: 0
    }
  ];

  beforeEach(async () => {
    resultsServiceMock = jasmine.createSpyObj<LanguageTestResultsService>('LanguageTestResultsService', [
      'getLatestResult', 'updateGeneratedSetId'
    ]);
    setApiMock = jasmine.createSpyObj<FlashcardSetApiService>('FlashcardSetApiService', ['createSet']);
    flashcardApiMock = jasmine.createSpyObj<FlashcardApiService>('FlashcardApiService', ['createFlashcards']);
    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);
    activatedRouteMock = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.callFake((key: string): string | null => key === 'level' ? 'b2-fce' : null)
        }
      }
    };

    resultsServiceMock.getLatestResult.and.returnValue(of(mockResult));
    resultsServiceMock.updateGeneratedSetId.and.returnValue(of(undefined));
    setApiMock.createSet.and.returnValue(of(mockSet));
    flashcardApiMock.createFlashcards.and.returnValue(of(mockFlashcards));

    await TestBed.configureTestingModule({
      imports: [LanguageTestResultsComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: LanguageTestResultsService, useValue: resultsServiceMock },
        { provide: FlashcardSetApiService, useValue: setApiMock },
        { provide: FlashcardApiService, useValue: flashcardApiMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageTestResultsComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load latest result for valid level', () => {
      fixture.detectChanges();

      expect(resultsServiceMock.getLatestResult).toHaveBeenCalledWith('b2-fce');
      expect(component.result()).toEqual(mockResult);
      expect(component.loading()).toBeFalse();
    });

    it('should set flashcardsGenerated when result has generated_set_id', () => {
      const resultWithSet: LanguageTestResultDTO = { ...mockResult, generated_set_id: 50 };
      resultsServiceMock.getLatestResult.and.returnValue(of(resultWithSet));

      fixture.detectChanges();

      expect(component.flashcardsGenerated()).toBeTrue();
    });

    it('should not set flashcardsGenerated when generated_set_id is null', () => {
      fixture.detectChanges();

      expect(component.flashcardsGenerated()).toBeFalse();
    });

    it('should show empty state when result is null', () => {
      resultsServiceMock.getLatestResult.and.returnValue(of(null));

      fixture.detectChanges();

      expect(component.loading()).toBeFalse();
      expect(component.result()).toBeNull();
    });

    it('should redirect for invalid level', () => {
      activatedRouteMock.snapshot.paramMap.get.and.callFake(
        (key: string): string | null => key === 'level' ? 'invalid' : null
      );

      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/language-test']);
    });

    it('should set error on load failure', () => {
      resultsServiceMock.getLatestResult.and.returnValue(throwError(() => new Error('fail')));

      fixture.detectChanges();

      expect(component.error()).toBe('Nie udało się załadować wyników.');
      expect(component.loading()).toBeFalse();
    });
  });

  describe('categories computed', () => {
    it('should compute category breakdown with percentages', () => {
      fixture.detectChanges();

      const cats: { name: string; correct: number; total: number; percentage: number }[] = component.categories();

      expect(cats.length).toBe(3);

      const grammar: { name: string; correct: number; total: number; percentage: number } | undefined =
        cats.find((c: { name: string }) => c.name === 'grammar');
      expect(grammar).toBeTruthy();
      expect(grammar!.correct).toBe(8);
      expect(grammar!.total).toBe(10);
      expect(grammar!.percentage).toBe(80);
    });

    it('should return empty array when result is null', () => {
      component.result.set(null);

      expect(component.categories()).toEqual([]);
    });
  });

  describe('generateFlashcards', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should create a flashcard set and flashcards from wrong answers', () => {
      component.generateFlashcards();

      expect(setApiMock.createSet).toHaveBeenCalled();
      expect(flashcardApiMock.createFlashcards).toHaveBeenCalled();
      expect(resultsServiceMock.updateGeneratedSetId).toHaveBeenCalledWith(1, 50);
      expect(component.flashcardsGenerated()).toBeTrue();
      expect(component.generatingFlashcards()).toBeFalse();
    });

    it('should not generate when result is null', () => {
      component.result.set(null);

      component.generateFlashcards();

      expect(setApiMock.createSet).not.toHaveBeenCalled();
    });

    it('should not generate when there are no wrong answers', () => {
      component.result.set({ ...mockResult, wrong_answers: [] });

      component.generateFlashcards();

      expect(setApiMock.createSet).not.toHaveBeenCalled();
    });

    it('should set error on generation failure', () => {
      setApiMock.createSet.and.returnValue(throwError(() => new Error('fail')));

      component.generateFlashcards();

      expect(component.error()).toBe('Nie udało się utworzyć fiszek. Spróbuj ponownie.');
      expect(component.generatingFlashcards()).toBeFalse();
    });

    it('should set generatingFlashcards to true during generation', () => {
      component.generateFlashcards();

      // After completion it should be false
      expect(component.generatingFlashcards()).toBeFalse();
    });
  });

  describe('getLevelLabel', () => {
    it('should return "B1 Preliminary" for b1 level', () => {
      component.result.set({ ...mockResult, level: 'b1' });

      expect(component.getLevelLabel()).toBe('B1 Preliminary');
    });

    it('should return "B2 First (FCE)" for b2-fce level', () => {
      component.result.set({ ...mockResult, level: 'b2-fce' });

      expect(component.getLevelLabel()).toBe('B2 First (FCE)');
    });

    it('should return "C1 Advanced (CAE)" for c1-cae level', () => {
      component.result.set({ ...mockResult, level: 'c1-cae' });

      expect(component.getLevelLabel()).toBe('C1 Advanced (CAE)');
    });

    it('should return empty string when result is null', () => {
      component.result.set(null);

      expect(component.getLevelLabel()).toBe('');
    });
  });
});
