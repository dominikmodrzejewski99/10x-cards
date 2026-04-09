import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { QuizViewComponent } from './quiz-view.component';
import { QuizFacadeService, QuizPhase } from '../../services/quiz-facade.service';
import {
  FlashcardDTO,
  QuizConfig,
  QuizQuestion,
  QuizAnswer,
  QuizResult
} from '../../../types';

describe('QuizViewComponent', () => {
  let component: QuizViewComponent;
  let fixture: ComponentFixture<QuizViewComponent>;

  let facadeMock: jasmine.SpyObj<QuizFacadeService>;
  let routerMock: jasmine.SpyObj<Router>;
  let routeParamsSubject: BehaviorSubject<Record<string, string>>;

  const mockFlashcards: FlashcardDTO[] = [
    { id: 1, front: 'word', back: 'slowo', front_image_url: null, back_audio_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: '', generation_id: null, set_id: 14, position: 0 },
    { id: 2, front: 'house', back: 'dom', front_image_url: null, back_audio_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: '', generation_id: null, set_id: 14, position: 0 },
    { id: 3, front: 'cat', back: 'kot', front_image_url: null, back_audio_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: '', generation_id: null, set_id: 14, position: 0 },
    { id: 4, front: 'dog', back: 'pies', front_image_url: null, back_audio_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: '', generation_id: null, set_id: 14, position: 0 },
    { id: 5, front: 'tree', back: 'drzewo', front_image_url: null, back_audio_url: null, front_language: 'en', back_language: 'pl', source: 'manual', created_at: '', updated_at: '', user_id: '', generation_id: null, set_id: 14, position: 0 }
  ];

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

    facadeMock = jasmine.createSpyObj<QuizFacadeService>('QuizFacadeService', [
      'loadSetData', 'startQuiz', 'submitAnswer', 'retry', 'retryWrong', 'retryStarred', 'reset'
    ], {
      phaseSignal: signal<QuizPhase>('config'),
      errorMessageSignal: signal<string>(''),
      setIdSignal: signal<number>(14),
      setNameSignal: signal<string>('Angielski B2'),
      flashcardsSignal: signal<FlashcardDTO[]>(mockFlashcards),
      questionsSignal: signal<QuizQuestion[]>(mockQuestions),
      currentIndexSignal: signal<number>(0),
      answersSignal: signal<QuizAnswer[]>([]),
      resultSignal: signal<QuizResult | null>(null),
      gradeTextSignal: signal<string>(''),
      currentQuestionSignal: signal<QuizQuestion | null>(mockQuestions[0])
    });

    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [QuizViewComponent, TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' } })],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: QuizFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { params: routeParamsSubject.asObservable() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QuizViewComponent);
    component = fixture.componentInstance;
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call facade.loadSetData with setId from route', () => {
      fixture.detectChanges();

      expect(facadeMock.loadSetData).toHaveBeenCalledWith(14);
    });

    it('should navigate to /quiz when setId is invalid', () => {
      routeParamsSubject.next({ setId: 'abc' });
      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/quiz']);
    });
  });

  describe('onStartQuiz', () => {
    it('should delegate to facade', () => {
      component.onStartQuiz(mockConfig);

      expect(facadeMock.startQuiz).toHaveBeenCalledWith(mockConfig);
    });
  });

  describe('onAnswerSubmitted', () => {
    it('should delegate to facade', () => {
      const answer: QuizAnswer = {
        questionId: 0, userAnswer: 'slowo', isCorrect: true,
        correctAnswer: 'slowo', questionText: 'word', timeMs: 0
      };

      component.onAnswerSubmitted(answer);

      expect(facadeMock.submitAnswer).toHaveBeenCalledWith(answer);
    });
  });

  describe('onRetry', () => {
    it('should delegate to facade', () => {
      component.onRetry();

      expect(facadeMock.retry).toHaveBeenCalled();
    });
  });

  describe('onRetryWrong', () => {
    it('should delegate to facade', () => {
      component.onRetryWrong();

      expect(facadeMock.retryWrong).toHaveBeenCalled();
    });
  });

  describe('onRetryStarred', () => {
    it('should delegate to facade', () => {
      component.onRetryStarred([0, 1]);

      expect(facadeMock.retryStarred).toHaveBeenCalledWith([0, 1]);
    });
  });

  describe('onGoBack', () => {
    it('should navigate to /sets/:setId', () => {
      component.onGoBack();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/sets', 14]);
    });
  });

  describe('onGoBackFromConfig', () => {
    it('should navigate to /sets/:setId', () => {
      component.onGoBackFromConfig();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/sets', 14]);
    });
  });
});
