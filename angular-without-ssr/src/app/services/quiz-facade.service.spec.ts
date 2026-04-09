import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { QuizFacadeService } from './quiz-facade.service';
import { FlashcardApiService } from './flashcard-api.service';
import { FlashcardSetApiService } from './flashcard-set-api.service';
import { QuizService } from './quiz.service';
import {
  FlashcardDTO,
  FlashcardSetDTO,
  QuizConfig,
  QuizQuestion,
  QuizAnswer,
  QuizResult
} from '../../types';

describe('QuizFacadeService', () => {
  let facade: QuizFacadeService;
  let flashcardApiMock: jasmine.SpyObj<FlashcardApiService>;
  let setApiMock: jasmine.SpyObj<FlashcardSetApiService>;
  let quizServiceMock: jasmine.SpyObj<QuizService>;

  const mockFlashcards: FlashcardDTO[] = [
    { id: 1, front: 'word', back: 'slowo', front_image_url: null, back_audio_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: '', generation_id: null, set_id: 14, position: 0 },
    { id: 2, front: 'house', back: 'dom', front_image_url: null, back_audio_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: '', generation_id: null, set_id: 14, position: 0 },
    { id: 3, front: 'cat', back: 'kot', front_image_url: null, back_audio_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: '', generation_id: null, set_id: 14, position: 0 },
    { id: 4, front: 'dog', back: 'pies', front_image_url: null, back_audio_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: '', generation_id: null, set_id: 14, position: 0 },
    { id: 5, front: 'tree', back: 'drzewo', front_image_url: null, back_audio_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: '', generation_id: null, set_id: 14, position: 0 }
  ];

  const mockSet: FlashcardSetDTO = {
    id: 14, user_id: 'user-1', name: 'Angielski B2', description: null, tags: [],
    is_public: false, copy_count: 0, published_at: null, created_at: '', updated_at: ''
  };

  const mockQuestions: QuizQuestion[] = mockFlashcards.map((card: FlashcardDTO, index: number) => ({
    id: index,
    type: 'written' as const,
    questionText: card.front,
    questionImageUrl: null,
    correctAnswer: card.back,
    sourceFlashcard: card
  }));

  const mockConfig: QuizConfig = {
    setId: 14,
    questionCount: 5,
    questionTypes: ['written'],
    reversed: false
  };

  const mockResult: QuizResult = {
    totalQuestions: 5,
    correctCount: 3,
    percentage: 60,
    totalTimeMs: 15000,
    answers: [
      { questionId: 0, userAnswer: 'slowo', isCorrect: true, correctAnswer: 'slowo', questionText: 'word', timeMs: 3000 },
      { questionId: 1, userAnswer: 'dom', isCorrect: true, correctAnswer: 'dom', questionText: 'house', timeMs: 3000 },
      { questionId: 2, userAnswer: 'piesek', isCorrect: false, correctAnswer: 'kot', questionText: 'cat', timeMs: 3000 },
      { questionId: 3, userAnswer: 'kot', isCorrect: false, correctAnswer: 'pies', questionText: 'dog', timeMs: 3000 },
      { questionId: 4, userAnswer: 'drzewo', isCorrect: true, correctAnswer: 'drzewo', questionText: 'tree', timeMs: 3000 }
    ]
  };

  beforeEach(() => {
    flashcardApiMock = jasmine.createSpyObj<FlashcardApiService>('FlashcardApiService', ['getAllFlashcardsForSet']);
    setApiMock = jasmine.createSpyObj<FlashcardSetApiService>('FlashcardSetApiService', ['getSet']);
    quizServiceMock = jasmine.createSpyObj<QuizService>('QuizService', [
      'generateQuestions', 'calculateResult', 'getGradeText', 'getWrongAnswers'
    ]);

    TestBed.configureTestingModule({
      imports: [TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' } })],
      providers: [
        QuizFacadeService,
        { provide: FlashcardApiService, useValue: flashcardApiMock },
        { provide: FlashcardSetApiService, useValue: setApiMock },
        { provide: QuizService, useValue: quizServiceMock },
      ],
    });

    facade = TestBed.inject(QuizFacadeService);
  });

  describe('loadSetData', () => {
    it('should load set name and flashcards, then set phase to config', () => {
      setApiMock.getSet.and.returnValue(of(mockSet));
      flashcardApiMock.getAllFlashcardsForSet.and.returnValue(of(mockFlashcards));

      facade.loadSetData(14);

      expect(facade.setIdSignal()).toBe(14);
      expect(facade.setNameSignal()).toBe('Angielski B2');
      expect(facade.flashcardsSignal()).toEqual(mockFlashcards);
      expect(facade.phaseSignal()).toBe('config');
    });

    it('should set error phase when set API fails', () => {
      setApiMock.getSet.and.returnValue(throwError(() => new Error('Not found')));

      facade.loadSetData(14);

      expect(facade.phaseSignal()).toBe('error');
      expect(facade.errorMessageSignal()).toBeTruthy();
    });

    it('should set error when set has fewer than 4 flashcards', () => {
      setApiMock.getSet.and.returnValue(of(mockSet));
      flashcardApiMock.getAllFlashcardsForSet.and.returnValue(of(mockFlashcards.slice(0, 3)));

      facade.loadSetData(14);

      expect(facade.phaseSignal()).toBe('error');
      expect(facade.errorMessageSignal()).toBeTruthy();
    });

    it('should set error when flashcard loading fails', () => {
      setApiMock.getSet.and.returnValue(of(mockSet));
      flashcardApiMock.getAllFlashcardsForSet.and.returnValue(throwError(() => new Error('Network error')));

      facade.loadSetData(14);

      expect(facade.phaseSignal()).toBe('error');
      expect(facade.errorMessageSignal()).toBeTruthy();
    });
  });

  describe('startQuiz', () => {
    beforeEach(() => {
      setApiMock.getSet.and.returnValue(of(mockSet));
      flashcardApiMock.getAllFlashcardsForSet.and.returnValue(of(mockFlashcards));
      quizServiceMock.generateQuestions.and.returnValue(mockQuestions);
      facade.loadSetData(14);
    });

    it('should generate questions and set phase to test', () => {
      facade.startQuiz(mockConfig);

      expect(quizServiceMock.generateQuestions).toHaveBeenCalledWith(mockFlashcards, mockConfig);
      expect(facade.questionsSignal()).toEqual(mockQuestions);
      expect(facade.currentIndexSignal()).toBe(0);
      expect(facade.answersSignal()).toEqual([]);
      expect(facade.resultSignal()).toBeNull();
      expect(facade.phaseSignal()).toBe('test');
    });
  });

  describe('submitAnswer', () => {
    beforeEach(() => {
      setApiMock.getSet.and.returnValue(of(mockSet));
      flashcardApiMock.getAllFlashcardsForSet.and.returnValue(of(mockFlashcards));
      quizServiceMock.generateQuestions.and.returnValue(mockQuestions);
      facade.loadSetData(14);
      facade.startQuiz(mockConfig);
    });

    it('should add answer and advance to next question', () => {
      const answer: QuizAnswer = {
        questionId: 0, userAnswer: 'slowo', isCorrect: true,
        correctAnswer: 'slowo', questionText: 'word', timeMs: 0
      };

      facade.submitAnswer(answer);

      expect(facade.answersSignal().length).toBe(1);
      expect(facade.answersSignal()[0].timeMs).toBeGreaterThanOrEqual(0);
      expect(facade.currentIndexSignal()).toBe(1);
      expect(facade.phaseSignal()).toBe('test');
    });

    it('should finish quiz after last answer', () => {
      const twoQuestions: QuizQuestion[] = mockQuestions.slice(0, 2);
      quizServiceMock.generateQuestions.and.returnValue(twoQuestions);
      quizServiceMock.calculateResult.and.returnValue(mockResult);
      quizServiceMock.getGradeText.and.returnValue('Poćwicz jeszcze');
      facade.startQuiz(mockConfig);

      const answer1: QuizAnswer = { questionId: 0, userAnswer: 'slowo', isCorrect: true, correctAnswer: 'slowo', questionText: 'word', timeMs: 0 };
      const answer2: QuizAnswer = { questionId: 1, userAnswer: 'dom', isCorrect: true, correctAnswer: 'dom', questionText: 'house', timeMs: 0 };

      facade.submitAnswer(answer1);
      facade.submitAnswer(answer2);

      expect(quizServiceMock.calculateResult).toHaveBeenCalled();
      expect(facade.phaseSignal()).toBe('results');
      expect(facade.resultSignal()).toEqual(mockResult);
      expect(facade.gradeTextSignal()).toBe('Poćwicz jeszcze');
    });
  });

  describe('retry', () => {
    beforeEach(() => {
      setApiMock.getSet.and.returnValue(of(mockSet));
      flashcardApiMock.getAllFlashcardsForSet.and.returnValue(of(mockFlashcards));
      quizServiceMock.generateQuestions.and.returnValue(mockQuestions);
      facade.loadSetData(14);
    });

    it('should restart quiz with last config', () => {
      facade.startQuiz(mockConfig);
      quizServiceMock.generateQuestions.calls.reset();

      facade.retry();

      expect(quizServiceMock.generateQuestions).toHaveBeenCalledWith(mockFlashcards, mockConfig);
      expect(facade.phaseSignal()).toBe('test');
    });

    it('should set phase to config when no last config', () => {
      facade.retry();

      expect(facade.phaseSignal()).toBe('config');
    });
  });

  describe('retryWrong', () => {
    it('should create quiz from wrong flashcards', () => {
      setApiMock.getSet.and.returnValue(of(mockSet));
      flashcardApiMock.getAllFlashcardsForSet.and.returnValue(of(mockFlashcards));
      quizServiceMock.generateQuestions.and.returnValue(mockQuestions);
      facade.loadSetData(14);
      facade.startQuiz(mockConfig);

      // Finish quiz
      const twoQuestions: QuizQuestion[] = mockQuestions.slice(0, 1);
      quizServiceMock.generateQuestions.and.returnValue(twoQuestions);
      quizServiceMock.calculateResult.and.returnValue(mockResult);
      quizServiceMock.getGradeText.and.returnValue('Poćwicz jeszcze');
      facade.startQuiz(mockConfig);

      const answer: QuizAnswer = { questionId: 0, userAnswer: 'slowo', isCorrect: true, correctAnswer: 'slowo', questionText: 'word', timeMs: 0 };
      facade.submitAnswer(answer);

      const wrongAnswers: QuizAnswer[] = [
        { questionId: 0, userAnswer: 'niepoprawne', isCorrect: false, correctAnswer: 'slowo', questionText: 'word', timeMs: 3000 }
      ];
      quizServiceMock.getWrongAnswers.and.returnValue(wrongAnswers);

      const generatedFromWrong: QuizQuestion[] = [{
        id: 0, type: 'written', questionText: 'word', questionImageUrl: null,
        correctAnswer: 'slowo', sourceFlashcard: mockFlashcards[0]
      }];
      quizServiceMock.generateQuestions.and.returnValue(generatedFromWrong);

      facade.retryWrong();

      expect(quizServiceMock.getWrongAnswers).toHaveBeenCalled();
      expect(facade.phaseSignal()).toBe('test');
      expect(facade.currentIndexSignal()).toBe(0);
      expect(facade.answersSignal()).toEqual([]);
    });
  });

  describe('retryStarred', () => {
    it('should create quiz from starred questions', () => {
      setApiMock.getSet.and.returnValue(of(mockSet));
      flashcardApiMock.getAllFlashcardsForSet.and.returnValue(of(mockFlashcards));
      quizServiceMock.generateQuestions.and.returnValue(mockQuestions);
      facade.loadSetData(14);
      facade.startQuiz(mockConfig);

      const starredQuestion: QuizQuestion = {
        id: 0, type: 'written', questionText: 'word', questionImageUrl: null,
        correctAnswer: 'slowo', sourceFlashcard: mockFlashcards[0]
      };
      quizServiceMock.generateQuestions.and.returnValue([starredQuestion]);

      facade.retryStarred([0, 1]);

      expect(quizServiceMock.generateQuestions).toHaveBeenCalled();
      expect(facade.phaseSignal()).toBe('test');
      expect(facade.currentIndexSignal()).toBe(0);
      expect(facade.answersSignal()).toEqual([]);
    });

    it('should do nothing when no last config', () => {
      facade.retryStarred([0, 1]);

      expect(facade.phaseSignal()).toBe('loading');
    });
  });

  describe('currentQuestionSignal', () => {
    beforeEach(() => {
      setApiMock.getSet.and.returnValue(of(mockSet));
      flashcardApiMock.getAllFlashcardsForSet.and.returnValue(of(mockFlashcards));
      quizServiceMock.generateQuestions.and.returnValue(mockQuestions);
      facade.loadSetData(14);
    });

    it('should return current question after starting quiz', () => {
      facade.startQuiz(mockConfig);

      expect(facade.currentQuestionSignal()).toBeTruthy();
      expect(facade.currentQuestionSignal()!.id).toBe(0);
    });

    it('should return null when no questions', () => {
      expect(facade.currentQuestionSignal()).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      setApiMock.getSet.and.returnValue(of(mockSet));
      flashcardApiMock.getAllFlashcardsForSet.and.returnValue(of(mockFlashcards));
      quizServiceMock.generateQuestions.and.returnValue(mockQuestions);
      facade.loadSetData(14);
      facade.startQuiz(mockConfig);

      facade.reset();

      expect(facade.phaseSignal()).toBe('loading');
      expect(facade.setIdSignal()).toBe(0);
      expect(facade.setNameSignal()).toBe('');
      expect(facade.flashcardsSignal()).toEqual([]);
      expect(facade.questionsSignal()).toEqual([]);
      expect(facade.currentIndexSignal()).toBe(0);
      expect(facade.answersSignal()).toEqual([]);
      expect(facade.resultSignal()).toBeNull();
      expect(facade.gradeTextSignal()).toBe('');
    });
  });
});
