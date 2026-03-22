import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { QuizViewComponent } from './quiz-view.component';
import { FlashcardApiService } from '../../services/flashcard-api.service';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { QuizService } from '../../services/quiz.service';
import {
  FlashcardDTO,
  FlashcardSetDTO,
  QuizConfig,
  QuizQuestion,
  QuizAnswer,
  QuizResult
} from '../../../types';

describe('QuizViewComponent', () => {
  let component: QuizViewComponent;
  let fixture: ComponentFixture<QuizViewComponent>;

  let flashcardApiServiceMock: jasmine.SpyObj<FlashcardApiService>;
  let flashcardSetApiServiceMock: jasmine.SpyObj<FlashcardSetApiService>;
  let quizServiceMock: jasmine.SpyObj<QuizService>;
  let routerMock: jasmine.SpyObj<Router>;
  let routeParamsSubject: BehaviorSubject<Record<string, string>>;

  const mockFlashcards: FlashcardDTO[] = [
    { id: 1, front: 'word', back: 'slowo', front_image_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: '', generation_id: null, set_id: 14 },
    { id: 2, front: 'house', back: 'dom', front_image_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: '', generation_id: null, set_id: 14 },
    { id: 3, front: 'cat', back: 'kot', front_image_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: '', generation_id: null, set_id: 14 },
    { id: 4, front: 'dog', back: 'pies', front_image_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: '', generation_id: null, set_id: 14 },
    { id: 5, front: 'tree', back: 'drzewo', front_image_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: '', generation_id: null, set_id: 14 }
  ];

  const mockSet: FlashcardSetDTO = {
    id: 14,
    user_id: 'user-1',
    name: 'Angielski B2',
    description: null,
    created_at: '',
    updated_at: ''
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

  beforeEach(async () => {
    routeParamsSubject = new BehaviorSubject<Record<string, string>>({ setId: '14' });

    flashcardApiServiceMock = jasmine.createSpyObj<FlashcardApiService>('FlashcardApiService', ['getFlashcards']);
    flashcardSetApiServiceMock = jasmine.createSpyObj<FlashcardSetApiService>('FlashcardSetApiService', ['getSet']);
    quizServiceMock = jasmine.createSpyObj<QuizService>('QuizService', [
      'generateQuestions',
      'calculateResult',
      'getGradeText',
      'getWrongAnswers'
    ]);
    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);

    flashcardSetApiServiceMock.getSet.and.returnValue(of(mockSet));
    flashcardApiServiceMock.getFlashcards.and.returnValue(of({ flashcards: mockFlashcards, totalRecords: mockFlashcards.length }));
    quizServiceMock.generateQuestions.and.returnValue(mockQuestions);
    quizServiceMock.calculateResult.and.returnValue(mockResult);
    quizServiceMock.getGradeText.and.returnValue('Poćwicz jeszcze');
    quizServiceMock.getWrongAnswers.and.returnValue(mockResult.answers.filter((a: QuizAnswer) => !a.isCorrect));

    await TestBed.configureTestingModule({
      imports: [QuizViewComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: FlashcardApiService, useValue: flashcardApiServiceMock },
        { provide: FlashcardSetApiService, useValue: flashcardSetApiServiceMock },
        { provide: QuizService, useValue: quizServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { params: routeParamsSubject.asObservable() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QuizViewComponent);
    component = fixture.componentInstance;
  });

  it('powinien zostac utworzony', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('powinien zaladowac dane zestawu i fiszki, a nastepnie przejsc do fazy config', () => {
      fixture.detectChanges();

      expect(flashcardSetApiServiceMock.getSet).toHaveBeenCalledWith(14);
      expect(flashcardApiServiceMock.getFlashcards).toHaveBeenCalledWith({
        limit: 9999,
        offset: 0,
        setId: 14
      });
      expect(component.setIdSignal()).toBe(14);
      expect(component.setNameSignal()).toBe('Angielski B2');
      expect(component.flashcardsSignal()).toEqual(mockFlashcards);
      expect(component.phaseSignal()).toBe('config');
    });

    it('powinien przekierowac do /quiz gdy setId jest nieprawidlowy', () => {
      routeParamsSubject.next({ setId: 'abc' });

      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/quiz']);
    });
  });

  describe('loadSetData', () => {
    it('powinien ustawic faze error gdy API zestawu zwroci blad', () => {
      flashcardSetApiServiceMock.getSet.and.returnValue(throwError(() => new Error('Not found')));

      fixture.detectChanges();

      expect(component.phaseSignal()).toBe('error');
      expect(component.errorMessageSignal()).toBe('Nie znaleziono zestawu.');
    });
  });

  describe('loadFlashcards', () => {
    it('powinien ustawic blad gdy zestaw ma mniej niz 4 fiszki', () => {
      const tooFewCards: FlashcardDTO[] = mockFlashcards.slice(0, 3);
      flashcardApiServiceMock.getFlashcards.and.returnValue(of({ flashcards: tooFewCards, totalRecords: tooFewCards.length }));

      fixture.detectChanges();

      expect(component.phaseSignal()).toBe('error');
      expect(component.errorMessageSignal()).toBe('Zestaw musi mieć minimum 4 fiszki, aby uruchomić test.');
    });

    it('powinien ustawic faze error gdy pobranie fiszek zakonczy sie bledem', () => {
      flashcardApiServiceMock.getFlashcards.and.returnValue(throwError(() => new Error('Network error')));

      fixture.detectChanges();

      expect(component.phaseSignal()).toBe('error');
      expect(component.errorMessageSignal()).toBe('Nie udało się pobrać fiszek.');
    });
  });

  describe('onStartQuiz', () => {
    it('powinien wygenerowac pytania, zresetowac stan i ustawic faze test', () => {
      fixture.detectChanges();

      component.onStartQuiz(mockConfig);

      expect(quizServiceMock.generateQuestions).toHaveBeenCalledWith(mockFlashcards, mockConfig);
      expect(component.questionsSignal()).toEqual(mockQuestions);
      expect(component.currentIndexSignal()).toBe(0);
      expect(component.answersSignal()).toEqual([]);
      expect(component.resultSignal()).toBeNull();
      expect(component.phaseSignal()).toBe('test');
    });
  });

  describe('onAnswerSubmitted', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.onStartQuiz(mockConfig);
    });

    it('powinien dodac odpowiedz z czasem i przejsc do nastepnego pytania', () => {
      const answer: QuizAnswer = {
        questionId: 0,
        userAnswer: 'slowo',
        isCorrect: true,
        correctAnswer: 'slowo',
        questionText: 'word',
        timeMs: 0
      };

      component.onAnswerSubmitted(answer);

      expect(component.answersSignal().length).toBe(1);
      expect(component.answersSignal()[0].questionId).toBe(0);
      expect(component.answersSignal()[0].timeMs).toBeGreaterThanOrEqual(0);
      expect(component.currentIndexSignal()).toBe(1);
      expect(component.phaseSignal()).toBe('test');
    });

    it('powinien wywolac finishQuiz po odpowiedzi na ostatnie pytanie', () => {
      const questions: QuizQuestion[] = mockQuestions.slice(0, 2);
      quizServiceMock.generateQuestions.and.returnValue(questions);
      component.onStartQuiz(mockConfig);

      const answer1: QuizAnswer = {
        questionId: 0, userAnswer: 'slowo', isCorrect: true,
        correctAnswer: 'slowo', questionText: 'word', timeMs: 0
      };
      const answer2: QuizAnswer = {
        questionId: 1, userAnswer: 'dom', isCorrect: true,
        correctAnswer: 'dom', questionText: 'house', timeMs: 0
      };

      component.onAnswerSubmitted(answer1);
      component.onAnswerSubmitted(answer2);

      expect(quizServiceMock.calculateResult).toHaveBeenCalled();
      expect(component.phaseSignal()).toBe('results');
      expect(component.resultSignal()).toEqual(mockResult);
      expect(component.gradeTextSignal()).toBe('Poćwicz jeszcze');
    });
  });

  describe('onRetry', () => {
    it('powinien ponownie uruchomic quiz z ostatnia konfiguracja', () => {
      fixture.detectChanges();
      component.onStartQuiz(mockConfig);

      quizServiceMock.generateQuestions.calls.reset();

      component.onRetry();

      expect(quizServiceMock.generateQuestions).toHaveBeenCalledWith(mockFlashcards, mockConfig);
      expect(component.phaseSignal()).toBe('test');
    });

    it('powinien przejsc do fazy config gdy brak ostatniej konfiguracji', () => {
      fixture.detectChanges();

      component.onRetry();

      expect(component.phaseSignal()).toBe('config');
    });
  });

  describe('onRetryWrong', () => {
    it('powinien utworzyc quiz z blednych fiszek', () => {
      fixture.detectChanges();
      component.onStartQuiz(mockConfig);

      // Symuluj zakonczenie quizu
      const shortQuestions: QuizQuestion[] = mockQuestions.slice(0, 1);
      quizServiceMock.generateQuestions.and.returnValue(shortQuestions);
      component.onStartQuiz(mockConfig);

      // Odpowiedz na jedyne pytanie, aby zakonczyc quiz
      const answer: QuizAnswer = {
        questionId: 0, userAnswer: 'slowo', isCorrect: true,
        correctAnswer: 'slowo', questionText: 'word', timeMs: 0
      };
      component.onAnswerSubmitted(answer);

      // Teraz resultSignal jest ustawiony
      expect(component.resultSignal()).toBeTruthy();

      // Przygotuj mock na retry wrong
      const wrongAnswers: QuizAnswer[] = [
        { questionId: 2, userAnswer: 'piesek', isCorrect: false, correctAnswer: 'kot', questionText: 'cat', timeMs: 3000 }
      ];
      quizServiceMock.getWrongAnswers.and.returnValue(wrongAnswers);

      // Ustaw pytania, aby find() moglo znalezc sourceFlashcard
      component.questionsSignal.set(mockQuestions);

      const generatedFromWrong: QuizQuestion[] = [{
        id: 0,
        type: 'written',
        questionText: 'cat',
        questionImageUrl: null,
        correctAnswer: 'kot',
        sourceFlashcard: mockFlashcards[2]
      }];
      quizServiceMock.generateQuestions.and.returnValue(generatedFromWrong);

      component.onRetryWrong();

      expect(quizServiceMock.getWrongAnswers).toHaveBeenCalled();
      expect(component.phaseSignal()).toBe('test');
      expect(component.currentIndexSignal()).toBe(0);
      expect(component.answersSignal()).toEqual([]);
    });
  });

  describe('onRetryStarred', () => {
    it('powinien utworzyc quiz z oznaczonych pytan', () => {
      fixture.detectChanges();
      component.onStartQuiz(mockConfig);

      // Ustaw pytania z sourceFlashcard
      component.questionsSignal.set(mockQuestions);

      const starredQuestion: QuizQuestion = {
        id: 0,
        type: 'written',
        questionText: 'word',
        questionImageUrl: null,
        correctAnswer: 'slowo',
        sourceFlashcard: mockFlashcards[0]
      };
      quizServiceMock.generateQuestions.and.returnValue([starredQuestion]);

      component.onRetryStarred([0, 1]);

      expect(quizServiceMock.generateQuestions).toHaveBeenCalled();
      expect(component.phaseSignal()).toBe('test');
      expect(component.currentIndexSignal()).toBe(0);
      expect(component.answersSignal()).toEqual([]);
    });

    it('powinien nie robic nic gdy brak ostatniej konfiguracji', () => {
      fixture.detectChanges();

      component.onRetryStarred([0, 1]);

      expect(component.phaseSignal()).toBe('config');
    });
  });

  describe('onGoBack', () => {
    it('powinien nawigowac do /sets/:setId', () => {
      fixture.detectChanges();

      component.onGoBack();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/sets', 14]);
    });
  });

  describe('currentQuestionSignal', () => {
    it('powinien zwrocic aktualne pytanie', () => {
      fixture.detectChanges();
      component.onStartQuiz(mockConfig);

      const currentQuestion: QuizQuestion | null = component.currentQuestionSignal;

      expect(currentQuestion).toBeTruthy();
      expect(currentQuestion!.id).toBe(0);
    });

    it('powinien zwrocic null gdy brak pytan', () => {
      fixture.detectChanges();

      const currentQuestion: QuizQuestion | null = component.currentQuestionSignal;

      expect(currentQuestion).toBeNull();
    });

    it('powinien zwrocic null gdy indeks wykracza poza zakres', () => {
      fixture.detectChanges();
      component.onStartQuiz(mockConfig);
      component.currentIndexSignal.set(999);

      const currentQuestion: QuizQuestion | null = component.currentQuestionSignal;

      expect(currentQuestion).toBeNull();
    });
  });
});
