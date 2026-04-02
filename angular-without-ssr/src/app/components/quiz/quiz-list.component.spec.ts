import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { TranslocoTestingModule } from '@jsverse/transloco';

import { QuizListComponent } from './quiz-list.component';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { FlashcardSetDTO } from '../../../types';

describe('QuizListComponent', () => {
  let component: QuizListComponent;
  let fixture: ComponentFixture<QuizListComponent>;

  let flashcardSetApiMock: jasmine.SpyObj<FlashcardSetApiService>;
  let routerMock: jasmine.SpyObj<Router>;

  const mockSet: FlashcardSetDTO = {
    id: 1,
    user_id: 'user-1',
    name: 'English',
    description: null,
    tags: [],
    is_public: false,
    copy_count: 0,
    published_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  };

  const mockSetsWithCount: { set: FlashcardSetDTO; cardCount: number }[] = [
    { set: mockSet, cardCount: 15 },
    {
      set: {
        id: 2, user_id: 'user-1', name: 'German', description: null,
        tags: [], is_public: false, copy_count: 0, published_at: null,
        created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z'
      },
      cardCount: 8
    }
  ];

  beforeEach(async () => {
    flashcardSetApiMock = jasmine.createSpyObj<FlashcardSetApiService>(
      'FlashcardSetApiService',
      ['getSetsWithCardCount']
    );
    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);

    flashcardSetApiMock.getSetsWithCardCount.and.returnValue(of(mockSetsWithCount));

    await TestBed.configureTestingModule({
      imports: [
        QuizListComponent,
        TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' } })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: FlashcardSetApiService, useValue: flashcardSetApiMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QuizListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load sets with card counts using a single query', () => {
      fixture.detectChanges();

      expect(flashcardSetApiMock.getSetsWithCardCount).toHaveBeenCalledTimes(1);
      expect(component.setsSignal().length).toBe(2);
      expect(component.setsSignal()[0].cardCount).toBe(15);
      expect(component.setsSignal()[1].cardCount).toBe(8);
      expect(component.loadingSignal()).toBeFalse();
      expect(component.errorSignal()).toBeNull();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no sets are returned', () => {
      flashcardSetApiMock.getSetsWithCardCount.and.returnValue(of([]));

      fixture.detectChanges();

      expect(component.setsSignal().length).toBe(0);
      expect(component.loadingSignal()).toBeFalse();
    });
  });

  describe('error handling', () => {
    it('should set error signal on load failure', () => {
      flashcardSetApiMock.getSetsWithCardCount.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      fixture.detectChanges();

      expect(component.errorSignal()).toBe('Nie udało się pobrać zestawów.');
      expect(component.loadingSignal()).toBeFalse();
    });
  });

  describe('navigation', () => {
    it('should navigate to quiz for given set', () => {
      fixture.detectChanges();

      component.onStartQuiz(1);

      expect(routerMock.navigate).toHaveBeenCalledWith(['/quiz', 1]);
    });

    it('should navigate to sets page', () => {
      fixture.detectChanges();

      component.onGoToSets();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/sets']);
    });
  });

  describe('loading state', () => {
    it('should start with loading true', () => {
      // Before detectChanges triggers ngOnInit
      expect(component.loadingSignal()).toBeTrue();
    });
  });
});
