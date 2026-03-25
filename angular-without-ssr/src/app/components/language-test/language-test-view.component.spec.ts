import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { LanguageTestViewComponent } from './language-test-view.component';
import { LanguageTestBankService } from '../../services/language-test-bank.service';
import { LanguageTestService, TestAnswer, TestResult } from '../../services/language-test.service';
import { LanguageTestResultsService } from '../../services/language-test-results.service';
import {
  TestDefinition,
  MultipleChoiceQuestion,
  WordFormationQuestion,
  LanguageTestResultDTO
} from '../../../types';

describe('LanguageTestViewComponent', () => {
  let component: LanguageTestViewComponent;
  let fixture: ComponentFixture<LanguageTestViewComponent>;

  let bankServiceMock: jasmine.SpyObj<LanguageTestBankService>;
  let testServiceMock: jasmine.SpyObj<LanguageTestService>;
  let resultsServiceMock: jasmine.SpyObj<LanguageTestResultsService>;
  let routerMock: jasmine.SpyObj<Router>;
  let activatedRouteMock: { snapshot: { paramMap: { get: jasmine.Spy } } };

  const mockMcQuestion: MultipleChoiceQuestion = {
    type: 'multiple-choice-cloze',
    id: 'q1',
    text: 'She ___ to the store yesterday.',
    options: ['go', 'went', 'gone', 'going'],
    correctIndex: 1,
    category: 'grammar',
    subcategory: 'past simple',
    explanation: 'Past simple of go is went.'
  };

  const mockWfQuestion: WordFormationQuestion = {
    type: 'word-formation',
    id: 'q2',
    text: 'The ___ of the building was impressive.',
    baseWord: 'construct',
    correctAnswer: 'construction',
    acceptedAnswers: ['construction'],
    category: 'word-building',
    subcategory: 'nouns',
    explanation: 'Construct becomes construction.'
  };

  const mockTestDefinition: TestDefinition = {
    level: 'b2-fce',
    title: 'B2 First (FCE)',
    description: 'Test B2',
    passingScore: 60,
    questions: [mockMcQuestion, mockWfQuestion]
  };

  const mockTestResult: TestResult = {
    totalScore: 1,
    maxScore: 2,
    percentage: 50,
    categoryBreakdown: {
      grammar: { correct: 1, total: 1 },
      'word-building': { correct: 0, total: 1 }
    },
    wrongAnswers: [{
      questionId: 'q2',
      userAnswer: 'constructing',
      correctAnswer: 'construction',
      front: 'Utwórz formę słowa construct: The ___ of the building was impressive.',
      back: 'construction — Construct becomes construction.'
    }],
    passed: false
  };

  const mockSavedResult: LanguageTestResultDTO = {
    id: 1,
    user_id: 'user-1',
    level: 'b2-fce',
    total_score: 1,
    max_score: 2,
    percentage: 50,
    category_breakdown: { grammar: { correct: 1, total: 1 } },
    wrong_answers: [],
    generated_set_id: null,
    completed_at: '2026-03-24T00:00:00Z',
    created_at: '2026-03-24T00:00:00Z',
    updated_at: '2026-03-24T00:00:00Z'
  };

  beforeEach(async () => {
    bankServiceMock = jasmine.createSpyObj<LanguageTestBankService>('LanguageTestBankService', ['getTest']);
    testServiceMock = jasmine.createSpyObj<LanguageTestService>('LanguageTestService', ['evaluateTest']);
    resultsServiceMock = jasmine.createSpyObj<LanguageTestResultsService>('LanguageTestResultsService', ['saveResult']);
    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);
    activatedRouteMock = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.callFake((key: string): string | null => key === 'level' ? 'b2-fce' : null)
        }
      }
    };

    bankServiceMock.getTest.and.returnValue(of(mockTestDefinition));
    testServiceMock.evaluateTest.and.returnValue(mockTestResult);
    resultsServiceMock.saveResult.and.returnValue(of(mockSavedResult));

    await TestBed.configureTestingModule({
      imports: [LanguageTestViewComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: LanguageTestBankService, useValue: bankServiceMock },
        { provide: LanguageTestService, useValue: testServiceMock },
        { provide: LanguageTestResultsService, useValue: resultsServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageTestViewComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load test definition for valid level', () => {
      fixture.detectChanges();

      expect(bankServiceMock.getTest).toHaveBeenCalledWith('b2-fce');
      expect(component.testDefinitionSignal()).toEqual(mockTestDefinition);
      expect(component.loadingSignal()).toBeFalse();
    });

    it('should redirect to /language-test for invalid level', () => {
      activatedRouteMock.snapshot.paramMap.get.and.callFake(
        (key: string): string | null => key === 'level' ? 'invalid-level' : null
      );

      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/language-test']);
    });

    it('should redirect when level is null', () => {
      activatedRouteMock.snapshot.paramMap.get.and.returnValue(null);

      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/language-test']);
    });

    it('should set error when test loading fails', () => {
      bankServiceMock.getTest.and.returnValue(throwError(() => new Error('network')));

      fixture.detectChanges();

      expect(component.errorSignal()).toBe('Nie udało się załadować testu. Spróbuj ponownie.');
      expect(component.loadingSignal()).toBeFalse();
    });
  });

  describe('computed signals', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('currentQuestionSignal should return the question at current index', () => {
      expect(component.currentQuestionSignal()).toEqual(mockMcQuestion);
    });

    it('currentQuestionSignal should return null when no test definition', () => {
      component.testDefinitionSignal.set(null);

      expect(component.currentQuestionSignal()).toBeNull();
    });

    it('progressSignal should compute correct percentage', () => {
      component.currentIndexSignal.set(0);

      expect(component.progressSignal()).toBe(0);
    });

    it('progressSignal should update as questions are answered', () => {
      component.currentIndexSignal.set(1);

      expect(component.progressSignal()).toBe(50);
    });

    it('isLastQuestionSignal should return false for first question', () => {
      component.currentIndexSignal.set(0);

      expect(component.isLastQuestionSignal()).toBeFalse();
    });

    it('isLastQuestionSignal should return true for last question', () => {
      component.currentIndexSignal.set(1);

      expect(component.isLastQuestionSignal()).toBeTrue();
    });

    it('isFirstQuestionSignal should return true for first question', () => {
      component.currentIndexSignal.set(0);

      expect(component.isFirstQuestionSignal()).toBeTrue();
    });

    it('isFirstQuestionSignal should return false for non-first question', () => {
      component.currentIndexSignal.set(1);

      expect(component.isFirstQuestionSignal()).toBeFalse();
    });

    it('canProceedSignal should return false when no option selected for MC', () => {
      component.selectedOptionSignal.set(null);

      expect(component.canProceedSignal()).toBeFalse();
    });

    it('canProceedSignal should return true when option is selected for MC', () => {
      component.selectedOptionSignal.set(1);

      expect(component.canProceedSignal()).toBeTrue();
    });

    it('canProceedSignal should return true for word-formation when input has text', () => {
      component.currentIndexSignal.set(1);
      component.wordFormationInputSignal.set('construction');

      expect(component.canProceedSignal()).toBeTrue();
    });

    it('canProceedSignal should return false for word-formation when input is empty', () => {
      component.currentIndexSignal.set(1);
      component.wordFormationInputSignal.set('  ');

      expect(component.canProceedSignal()).toBeFalse();
    });
  });

  describe('selectOption', () => {
    it('should set selected option index', () => {
      component.selectOption(2);

      expect(component.selectedOptionSignal()).toBe(2);
    });
  });

  describe('onKeydown', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should select option when pressing 1-4 on MC question', () => {
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: '2' });
      spyOn(event, 'preventDefault');

      component.onKeydown(event);

      expect(component.selectedOptionSignal()).toBe(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not select option when pressing key > number of options', () => {
      component.selectedOptionSignal.set(null);
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: '5' });

      component.onKeydown(event);

      expect(component.selectedOptionSignal()).toBeNull();
    });

    it('should call next on Enter when canProceed is true', () => {
      component.selectedOptionSignal.set(1);
      spyOn(component, 'next');
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      spyOn(event, 'preventDefault');

      component.onKeydown(event);

      expect(component.next).toHaveBeenCalled();
    });

    it('should not call next on Enter when canProceed is false', () => {
      component.selectedOptionSignal.set(null);
      spyOn(component, 'next');
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: 'Enter' });

      component.onKeydown(event);

      expect(component.next).not.toHaveBeenCalled();
    });

    it('should do nothing when loading', () => {
      component.loadingSignal.set(true);
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: '1' });

      component.onKeydown(event);

      expect(component.selectedOptionSignal()).toBeNull();
    });
  });

  describe('next', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should save answer and advance to next question for MC question', () => {
      component.selectedOptionSignal.set(1);

      component.next();

      expect(component.answersMapSignal().size).toBe(1);
      const answer: TestAnswer | undefined = component.answersMapSignal().get(0);
      expect(answer?.questionId).toBe('q1');
      expect(answer?.answer).toBe(1);
      expect(component.currentIndexSignal()).toBe(1);
      expect(component.selectedOptionSignal()).toBeNull();
    });

    it('should save answer with text for word-formation question', () => {
      component.currentIndexSignal.set(1);
      component.wordFormationInputSignal.set('construction');

      component.next();

      const answer: TestAnswer | undefined = component.answersMapSignal().get(1);
      expect(answer?.questionId).toBe('q2');
      expect(answer?.answer).toBe('construction');
    });

    it('should submit test when on last question', () => {
      component.selectedOptionSignal.set(1);
      component.next();

      component.wordFormationInputSignal.set('construction');
      component.next();

      expect(testServiceMock.evaluateTest).toHaveBeenCalled();
      expect(resultsServiceMock.saveResult).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/language-test', 'b2-fce', 'results']);
    });

    it('should navigate to results even on save error', () => {
      resultsServiceMock.saveResult.and.returnValue(throwError(() => new Error('save failed')));

      component.selectedOptionSignal.set(1);
      component.next();
      component.wordFormationInputSignal.set('construction');
      component.next();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/language-test', 'b2-fce', 'results']);
    });

    it('should do nothing when currentQuestion is null', () => {
      component.testDefinitionSignal.set(null);

      component.next();

      expect(component.answersMapSignal().size).toBe(0);
    });

    it('should reset selectedOption and wordFormationInput after advancing', () => {
      component.selectedOptionSignal.set(1);
      component.wordFormationInputSignal.set('test');

      component.next();

      expect(component.selectedOptionSignal()).toBeNull();
      expect(component.wordFormationInputSignal()).toBe('');
    });
  });

  describe('skip', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should advance without saving answer', () => {
      component.skip();

      expect(component.currentIndexSignal()).toBe(1);
      expect(component.answersMapSignal().size).toBe(0);
    });

    it('should not advance past last question', () => {
      component.currentIndexSignal.set(1);

      component.skip();

      expect(component.currentIndexSignal()).toBe(1);
    });
  });

  describe('previous', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should not go before first question', () => {
      component.previous();

      expect(component.currentIndexSignal()).toBe(0);
    });

    it('should go back and restore answer', () => {
      component.selectedOptionSignal.set(1);
      component.next();

      expect(component.currentIndexSignal()).toBe(1);

      component.previous();

      expect(component.currentIndexSignal()).toBe(0);
      expect(component.selectedOptionSignal()).toBe(1);
    });
  });
});
