import { TestBed } from '@angular/core/testing';
import { LanguageTestService, TestAnswer, TestResult } from './language-test.service';
import {
  TestQuestion, MultipleChoiceQuestion, WordFormationQuestion,
  CategoryBreakdown, WrongAnswer
} from '../../types';

function createMCQuestion(overrides: Partial<MultipleChoiceQuestion> = {}): MultipleChoiceQuestion {
  return {
    type: 'multiple-choice-cloze',
    id: 'mc-1',
    text: 'She ___ to the store yesterday.',
    options: ['go', 'went', 'gone', 'goes'],
    correctIndex: 1,
    category: 'grammar',
    subcategory: 'past-simple',
    explanation: '"went" is the past simple form of "go".',
    ...overrides
  };
}

function createWFQuestion(overrides: Partial<WordFormationQuestion> = {}): WordFormationQuestion {
  return {
    type: 'word-formation',
    id: 'wf-1',
    text: 'The ___ of the project was impressive.',
    baseWord: 'manage',
    correctAnswer: 'management',
    acceptedAnswers: ['management'],
    category: 'word-building',
    subcategory: 'noun-formation',
    explanation: '"management" is the noun form of "manage".',
    ...overrides
  };
}

describe('LanguageTestService', () => {
  let service: LanguageTestService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LanguageTestService]
    });
    service = TestBed.inject(LanguageTestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('evaluateTest', () => {
    it('should score a perfect test correctly', () => {
      const questions: TestQuestion[] = [
        createMCQuestion({ id: 'mc-1' }),
        createWFQuestion({ id: 'wf-1' })
      ];
      const answers: TestAnswer[] = [
        { questionId: 'mc-1', answer: 1 },
        { questionId: 'wf-1', answer: 'management' }
      ];

      const result: TestResult = service.evaluateTest(questions, answers, 60);

      expect(result.totalScore).toBe(2);
      expect(result.maxScore).toBe(2);
      expect(result.percentage).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.wrongAnswers.length).toBe(0);
    });

    it('should score a failing test correctly', () => {
      const questions: TestQuestion[] = [
        createMCQuestion({ id: 'mc-1' }),
        createMCQuestion({ id: 'mc-2', correctIndex: 2 })
      ];
      const answers: TestAnswer[] = [
        { questionId: 'mc-1', answer: 0 }, // wrong
        { questionId: 'mc-2', answer: 0 }  // wrong
      ];

      const result: TestResult = service.evaluateTest(questions, answers, 60);

      expect(result.totalScore).toBe(0);
      expect(result.percentage).toBe(0);
      expect(result.passed).toBe(false);
      expect(result.wrongAnswers.length).toBe(2);
    });

    it('should handle unanswered questions as wrong', () => {
      const questions: TestQuestion[] = [
        createMCQuestion({ id: 'mc-1' }),
        createWFQuestion({ id: 'wf-1' })
      ];
      const answers: TestAnswer[] = []; // no answers

      const result: TestResult = service.evaluateTest(questions, answers, 60);

      expect(result.totalScore).toBe(0);
      expect(result.wrongAnswers.length).toBe(2);
    });

    it('should track category breakdown correctly', () => {
      const questions: TestQuestion[] = [
        createMCQuestion({ id: 'mc-1', category: 'grammar' }),
        createMCQuestion({ id: 'mc-2', category: 'grammar', correctIndex: 0 }),
        createWFQuestion({ id: 'wf-1', category: 'word-building' })
      ];
      const answers: TestAnswer[] = [
        { questionId: 'mc-1', answer: 1 },   // correct
        { questionId: 'mc-2', answer: 1 },   // wrong
        { questionId: 'wf-1', answer: 'management' } // correct
      ];

      const result: TestResult = service.evaluateTest(questions, answers, 60);
      const breakdown: CategoryBreakdown = result.categoryBreakdown;

      expect(breakdown['grammar'].correct).toBe(1);
      expect(breakdown['grammar'].total).toBe(2);
      expect(breakdown['word-building'].correct).toBe(1);
      expect(breakdown['word-building'].total).toBe(1);
    });

    it('should calculate percentage with rounding', () => {
      const questions: TestQuestion[] = [
        createMCQuestion({ id: 'mc-1' }),
        createMCQuestion({ id: 'mc-2', correctIndex: 3 }),
        createMCQuestion({ id: 'mc-3', correctIndex: 0 })
      ];
      const answers: TestAnswer[] = [
        { questionId: 'mc-1', answer: 1 }, // correct
        { questionId: 'mc-2', answer: 0 }, // wrong
        { questionId: 'mc-3', answer: 0 }  // correct
      ];

      const result: TestResult = service.evaluateTest(questions, answers, 60);

      // 2/3 = 66.666... -> rounded to 66.67
      expect(result.percentage).toBe(66.67);
      expect(result.passed).toBe(true);
    });

    it('should determine passed based on passingScore threshold', () => {
      const questions: TestQuestion[] = [createMCQuestion()];
      const correctAnswer: TestAnswer[] = [{ questionId: 'mc-1', answer: 1 }];
      const wrongAnswer: TestAnswer[] = [{ questionId: 'mc-1', answer: 0 }];

      const passResult: TestResult = service.evaluateTest(questions, correctAnswer, 100);
      expect(passResult.passed).toBe(true);

      const failResult: TestResult = service.evaluateTest(questions, wrongAnswer, 50);
      expect(failResult.passed).toBe(false);
    });

    it('should accept case-insensitive word-formation answers', () => {
      const questions: TestQuestion[] = [createWFQuestion({ id: 'wf-1' })];
      const answers: TestAnswer[] = [{ questionId: 'wf-1', answer: 'MANAGEMENT' }];

      const result: TestResult = service.evaluateTest(questions, answers, 60);

      expect(result.totalScore).toBe(1);
    });

    it('should accept any of the acceptedAnswers for word-formation', () => {
      const questions: TestQuestion[] = [
        createWFQuestion({ id: 'wf-1', acceptedAnswers: ['management', 'managing'] })
      ];
      const answers: TestAnswer[] = [{ questionId: 'wf-1', answer: 'managing' }];

      const result: TestResult = service.evaluateTest(questions, answers, 60);

      expect(result.totalScore).toBe(1);
    });

    it('should build correct wrongAnswer for multiple-choice question', () => {
      const mc: MultipleChoiceQuestion = createMCQuestion({ id: 'mc-1' });
      const questions: TestQuestion[] = [mc];
      const answers: TestAnswer[] = [{ questionId: 'mc-1', answer: 0 }]; // chose 'go' instead of 'went'

      const result: TestResult = service.evaluateTest(questions, answers, 60);
      const wrong: WrongAnswer = result.wrongAnswers[0];

      expect(wrong.questionId).toBe('mc-1');
      expect(wrong.userAnswer).toBe('go');
      expect(wrong.correctAnswer).toBe('went');
      expect(wrong.front).toBe(mc.text);
    });

    it('should build correct wrongAnswer for unanswered question', () => {
      const questions: TestQuestion[] = [createMCQuestion({ id: 'mc-1' })];
      const answers: TestAnswer[] = []; // no answer

      const result: TestResult = service.evaluateTest(questions, answers, 60);
      const wrong: WrongAnswer = result.wrongAnswers[0];

      expect(wrong.userAnswer).toBe('(brak odpowiedzi)');
    });

    it('should build correct wrongAnswer for word-formation question', () => {
      const wf: WordFormationQuestion = createWFQuestion({ id: 'wf-1' });
      const questions: TestQuestion[] = [wf];
      const answers: TestAnswer[] = [{ questionId: 'wf-1', answer: 'manager' }];

      const result: TestResult = service.evaluateTest(questions, answers, 60);
      const wrong: WrongAnswer = result.wrongAnswers[0];

      expect(wrong.questionId).toBe('wf-1');
      expect(wrong.userAnswer).toBe('manager');
      expect(wrong.correctAnswer).toBe('management');
      expect(wrong.front).toContain(wf.baseWord);
    });
  });
});
