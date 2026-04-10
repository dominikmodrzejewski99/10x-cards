import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { LanguageTestFacadeService } from './language-test-facade.service';
import { LanguageTestBankService } from './language-test-bank.service';
import { LanguageTestService, TestAnswer, TestResult } from './language-test.service';
import { LanguageTestResultsService } from './language-test-results.service';
import {
  TestDefinition,
  MultipleChoiceQuestion,
  WordFormationQuestion,
  LanguageTestResultDTO
} from '../../types';

describe('LanguageTestFacadeService', () => {
  let facade: LanguageTestFacadeService;
  let bankServiceMock: jasmine.SpyObj<LanguageTestBankService>;
  let testServiceMock: jasmine.SpyObj<LanguageTestService>;
  let resultsServiceMock: jasmine.SpyObj<LanguageTestResultsService>;

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

  beforeEach(() => {
    bankServiceMock = jasmine.createSpyObj<LanguageTestBankService>('LanguageTestBankService', ['getTest']);
    testServiceMock = jasmine.createSpyObj<LanguageTestService>('LanguageTestService', ['evaluateTest']);
    resultsServiceMock = jasmine.createSpyObj<LanguageTestResultsService>('LanguageTestResultsService', ['saveResult']);

    bankServiceMock.getTest.and.returnValue(of(mockTestDefinition));
    testServiceMock.evaluateTest.and.returnValue(mockTestResult);
    resultsServiceMock.saveResult.and.returnValue(of(mockSavedResult));

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' }
        })
      ],
      providers: [
        LanguageTestFacadeService,
        { provide: LanguageTestBankService, useValue: bankServiceMock },
        { provide: LanguageTestService, useValue: testServiceMock },
        { provide: LanguageTestResultsService, useValue: resultsServiceMock }
      ]
    });

    facade = TestBed.inject(LanguageTestFacadeService);
    facade.reset();
  });

  describe('loadTest', () => {
    it('should load test definition and set loading to false', () => {
      facade.loadTest('b2-fce');

      expect(bankServiceMock.getTest).toHaveBeenCalledWith('b2-fce');
      expect(facade.testDefinitionSignal()).toEqual(mockTestDefinition);
      expect(facade.loadingSignal()).toBeFalse();
    });

    it('should set error when test loading fails', () => {
      bankServiceMock.getTest.and.returnValue(throwError(() => new Error('network')));

      facade.loadTest('b2-fce');

      expect(facade.errorSignal()).toBe('languageTest.errors.loadTestFailed');
      expect(facade.loadingSignal()).toBeFalse();
    });
  });

  describe('computed signals', () => {
    beforeEach(() => {
      facade.loadTest('b2-fce');
    });

    it('currentQuestionSignal should return the question at current index', () => {
      expect(facade.currentQuestionSignal()).toEqual(mockMcQuestion);
    });

    it('currentQuestionSignal should return null when no test definition', () => {
      facade.reset();

      expect(facade.currentQuestionSignal()).toBeNull();
    });

    it('progressSignal should compute correct percentage', () => {
      expect(facade.progressSignal()).toBe(0);
    });

    it('progressSignal should update as questions advance', () => {
      facade.selectOption(1);
      facade.next();

      expect(facade.progressSignal()).toBe(50);
    });

    it('isLastQuestionSignal should return false for first question', () => {
      expect(facade.isLastQuestionSignal()).toBeFalse();
    });

    it('isLastQuestionSignal should return true for last question', () => {
      facade.selectOption(1);
      facade.next();

      expect(facade.isLastQuestionSignal()).toBeTrue();
    });

    it('isFirstQuestionSignal should return true for first question', () => {
      expect(facade.isFirstQuestionSignal()).toBeTrue();
    });

    it('isFirstQuestionSignal should return false for non-first question', () => {
      facade.selectOption(1);
      facade.next();

      expect(facade.isFirstQuestionSignal()).toBeFalse();
    });

    it('canProceedSignal should return false when no option selected for MC', () => {
      expect(facade.canProceedSignal()).toBeFalse();
    });

    it('canProceedSignal should return true when option is selected for MC', () => {
      facade.selectOption(1);

      expect(facade.canProceedSignal()).toBeTrue();
    });

    it('canProceedSignal should return true for word-formation when input has text', () => {
      facade.selectOption(1);
      facade.next();
      facade.setWordFormationInput('construction');

      expect(facade.canProceedSignal()).toBeTrue();
    });

    it('canProceedSignal should return false for word-formation when input is empty', () => {
      facade.selectOption(1);
      facade.next();
      facade.setWordFormationInput('  ');

      expect(facade.canProceedSignal()).toBeFalse();
    });
  });

  describe('selectOption', () => {
    it('should set selected option index', () => {
      facade.selectOption(2);

      expect(facade.selectedOptionSignal()).toBe(2);
    });
  });

  describe('setWordFormationInput', () => {
    it('should set word formation input value', () => {
      facade.setWordFormationInput('test');

      expect(facade.wordFormationInputSignal()).toBe('test');
    });
  });

  describe('handleKeydown', () => {
    beforeEach(() => {
      facade.loadTest('b2-fce');
    });

    it('should select option when pressing 1-4 on MC question', () => {
      const prevented: boolean = facade.handleKeydown('2');

      expect(facade.selectedOptionSignal()).toBe(1);
      expect(prevented).toBeTrue();
    });

    it('should not select option when pressing key > number of options', () => {
      const prevented: boolean = facade.handleKeydown('5');

      expect(facade.selectedOptionSignal()).toBeNull();
      expect(prevented).toBeFalse();
    });

    it('should call next on Enter when canProceed is true', () => {
      facade.selectOption(1);
      spyOn(facade, 'next');

      const prevented: boolean = facade.handleKeydown('Enter');

      expect(facade.next).toHaveBeenCalled();
      expect(prevented).toBeTrue();
    });

    it('should not call next on Enter when canProceed is false', () => {
      spyOn(facade, 'next');

      const prevented: boolean = facade.handleKeydown('Enter');

      expect(facade.next).not.toHaveBeenCalled();
      expect(prevented).toBeFalse();
    });

    it('should return false when loading', () => {
      facade.reset();

      const prevented: boolean = facade.handleKeydown('1');

      expect(prevented).toBeFalse();
    });
  });

  describe('next', () => {
    beforeEach(() => {
      facade.loadTest('b2-fce');
    });

    it('should save answer and advance to next question for MC question', () => {
      facade.selectOption(1);

      facade.next();

      expect(facade.answersMapSignal().size).toBe(1);
      const answer: TestAnswer | undefined = facade.answersMapSignal().get(0);
      expect(answer?.questionId).toBe('q1');
      expect(answer?.answer).toBe(1);
      expect(facade.currentIndexSignal()).toBe(1);
      expect(facade.selectedOptionSignal()).toBeNull();
    });

    it('should save answer with text for word-formation question', () => {
      facade.selectOption(1);
      facade.next();
      facade.setWordFormationInput('construction');

      facade.next();

      const answer: TestAnswer | undefined = facade.answersMapSignal().get(1);
      expect(answer?.questionId).toBe('q2');
      expect(answer?.answer).toBe('construction');
    });

    it('should submit test when on last question', () => {
      facade.selectOption(1);
      facade.next();

      facade.setWordFormationInput('construction');
      facade.next();

      expect(testServiceMock.evaluateTest).toHaveBeenCalled();
      expect(resultsServiceMock.saveResult).toHaveBeenCalled();
      expect(facade.completedResultSignal()).toEqual({
        level: 'b2-fce',
        route: ['/language-test', 'b2-fce', 'results'],
        state: { result: mockSavedResult }
      });
    });

    it('should set completedResult without state on save error', () => {
      resultsServiceMock.saveResult.and.returnValue(throwError(() => new Error('save failed')));

      facade.selectOption(1);
      facade.next();
      facade.setWordFormationInput('construction');
      facade.next();

      expect(facade.completedResultSignal()).toEqual({
        level: 'b2-fce',
        route: ['/language-test', 'b2-fce', 'results']
      });
    });

    it('should do nothing when currentQuestion is null', () => {
      facade.reset();

      facade.next();

      expect(facade.answersMapSignal().size).toBe(0);
    });

    it('should reset selectedOption and wordFormationInput after advancing', () => {
      facade.selectOption(1);
      facade.setWordFormationInput('test');

      facade.next();

      expect(facade.selectedOptionSignal()).toBeNull();
      expect(facade.wordFormationInputSignal()).toBe('');
    });
  });

  describe('skip', () => {
    beforeEach(() => {
      facade.loadTest('b2-fce');
    });

    it('should advance without saving answer', () => {
      facade.skip();

      expect(facade.currentIndexSignal()).toBe(1);
      expect(facade.answersMapSignal().size).toBe(0);
    });

    it('should not advance past last question', () => {
      facade.selectOption(1);
      facade.next();

      facade.skip();

      expect(facade.currentIndexSignal()).toBe(1);
    });
  });

  describe('previous', () => {
    beforeEach(() => {
      facade.loadTest('b2-fce');
    });

    it('should not go before first question', () => {
      facade.previous();

      expect(facade.currentIndexSignal()).toBe(0);
    });

    it('should go back and restore answer', () => {
      facade.selectOption(1);
      facade.next();

      expect(facade.currentIndexSignal()).toBe(1);

      facade.previous();

      expect(facade.currentIndexSignal()).toBe(0);
      expect(facade.selectedOptionSignal()).toBe(1);
    });
  });

  describe('splitByGap', () => {
    it('should split text at ___', () => {
      const result = facade.splitByGap('before___after');

      expect(result).toEqual({ before: 'before', after: 'after' });
    });

    it('should handle text with no gap marker', () => {
      const result = facade.splitByGap('no gap here');

      expect(result).toEqual({ before: 'no gap here', after: '' });
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      facade.loadTest('b2-fce');
      facade.selectOption(1);
      facade.next();

      facade.reset();

      expect(facade.testDefinitionSignal()).toBeNull();
      expect(facade.currentIndexSignal()).toBe(0);
      expect(facade.answersMapSignal().size).toBe(0);
      expect(facade.selectedOptionSignal()).toBeNull();
      expect(facade.wordFormationInputSignal()).toBe('');
      expect(facade.loadingSignal()).toBeTrue();
      expect(facade.submittingSignal()).toBeFalse();
      expect(facade.errorSignal()).toBeNull();
      expect(facade.completedResultSignal()).toBeNull();
    });
  });
});
