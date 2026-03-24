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
      expect(component.testDefinition()).toEqual(mockTestDefinition);
      expect(component.loading()).toBeFalse();
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

      expect(component.error()).toBe('Nie udało się załadować testu. Spróbuj ponownie.');
      expect(component.loading()).toBeFalse();
    });
  });

  describe('computed signals', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('currentQuestion should return the question at current index', () => {
      expect(component.currentQuestion()).toEqual(mockMcQuestion);
    });

    it('currentQuestion should return null when no test definition', () => {
      component.testDefinition.set(null);

      expect(component.currentQuestion()).toBeNull();
    });

    it('progress should compute correct percentage', () => {
      component.currentIndex.set(0);

      expect(component.progress()).toBe(0); // 0/2 * 100 = 0
    });

    it('progress should update as questions are answered', () => {
      component.currentIndex.set(1);

      expect(component.progress()).toBe(50); // 1/2 * 100 = 50
    });

    it('isLastQuestion should return false for first question', () => {
      component.currentIndex.set(0);

      expect(component.isLastQuestion()).toBeFalse();
    });

    it('isLastQuestion should return true for last question', () => {
      component.currentIndex.set(1);

      expect(component.isLastQuestion()).toBeTrue();
    });

    it('canProceed should return false when no option selected for MC', () => {
      component.selectedOption.set(null);

      expect(component.canProceed()).toBeFalse();
    });

    it('canProceed should return true when option is selected for MC', () => {
      component.selectedOption.set(1);

      expect(component.canProceed()).toBeTrue();
    });

    it('canProceed should return true for word-formation when input has text', () => {
      component.currentIndex.set(1); // word-formation question
      component.wordFormationInput.set('construction');

      expect(component.canProceed()).toBeTrue();
    });

    it('canProceed should return false for word-formation when input is empty', () => {
      component.currentIndex.set(1);
      component.wordFormationInput.set('  ');

      expect(component.canProceed()).toBeFalse();
    });
  });

  describe('selectOption', () => {
    it('should set selected option index', () => {
      component.selectOption(2);

      expect(component.selectedOption()).toBe(2);
    });
  });

  describe('next', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should add answer and advance to next question for MC question', () => {
      component.selectedOption.set(1);

      component.next();

      expect(component.answers().length).toBe(1);
      expect(component.answers()[0].questionId).toBe('q1');
      expect(component.answers()[0].answer).toBe(1);
      expect(component.currentIndex()).toBe(1);
      expect(component.selectedOption()).toBeNull();
    });

    it('should add answer with text for word-formation question', () => {
      component.currentIndex.set(1);
      component.wordFormationInput.set('construction');

      component.next();

      const lastAnswer: TestAnswer = component.answers()[component.answers().length - 1];
      expect(lastAnswer.questionId).toBe('q2');
      expect(lastAnswer.answer).toBe('construction');
    });

    it('should submit test when on last question', () => {
      // Answer first question
      component.selectedOption.set(1);
      component.next();

      // Answer second (last) question
      component.wordFormationInput.set('construction');
      component.next();

      expect(testServiceMock.evaluateTest).toHaveBeenCalled();
      expect(resultsServiceMock.saveResult).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/language-test', 'b2-fce', 'results']);
    });

    it('should navigate to results even on save error', () => {
      resultsServiceMock.saveResult.and.returnValue(throwError(() => new Error('save failed')));

      component.selectedOption.set(1);
      component.next();
      component.wordFormationInput.set('construction');
      component.next();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/language-test', 'b2-fce', 'results']);
    });

    it('should do nothing when currentQuestion is null', () => {
      component.testDefinition.set(null);

      component.next();

      expect(component.answers().length).toBe(0);
    });

    it('should reset selectedOption and wordFormationInput after advancing', () => {
      component.selectedOption.set(1);
      component.wordFormationInput.set('test');

      component.next();

      expect(component.selectedOption()).toBeNull();
      expect(component.wordFormationInput()).toBe('');
    });
  });
});
