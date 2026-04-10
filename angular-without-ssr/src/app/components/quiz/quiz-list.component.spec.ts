import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { QuizListComponent } from './quiz-list.component';
import { QuizFacadeService } from '../../services/quiz-facade.service';

describe('QuizListComponent', () => {
  let component: QuizListComponent;
  let fixture: ComponentFixture<QuizListComponent>;
  let routerMock: jasmine.SpyObj<Router>;

  const facadeMock: Record<string, jasmine.Spy> = {
    quizSetsSignal: jasmine.createSpy('quizSetsSignal').and.returnValue([]),
    quizSetsLoadingSignal: jasmine.createSpy('quizSetsLoadingSignal').and.returnValue(false),
    quizSetsErrorSignal: jasmine.createSpy('quizSetsErrorSignal').and.returnValue(null),
    loadQuizSets: jasmine.createSpy('loadQuizSets'),
  };

  beforeEach(async () => {
    Object.values(facadeMock).forEach((spy: jasmine.Spy) => spy.calls.reset());

    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        QuizListComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: QuizFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call facade.loadQuizSets()', () => {
      fixture.detectChanges();

      expect(facadeMock['loadQuizSets']).toHaveBeenCalledTimes(1);
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
});
