import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { LanguageTestViewComponent } from './language-test-view.component';
import { LanguageTestFacadeService } from '../../services/language-test-facade.service';
import {
  TestDefinition,
  MultipleChoiceQuestion,
  WordFormationQuestion
} from '../../../types';

describe('LanguageTestViewComponent', () => {
  let component: LanguageTestViewComponent;
  let fixture: ComponentFixture<LanguageTestViewComponent>;

  let facadeMock: jasmine.SpyObj<LanguageTestFacadeService>;
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

  beforeEach(async () => {
    facadeMock = jasmine.createSpyObj<LanguageTestFacadeService>(
      'LanguageTestFacadeService',
      ['loadTest', 'selectOption', 'setWordFormationInput', 'next', 'skip', 'previous', 'splitByGap', 'handleKeydown', 'reset'],
      {
        testDefinitionSignal: signal<TestDefinition | null>(mockTestDefinition),
        currentIndexSignal: signal<number>(0),
        answersMapSignal: signal<Map<number, any>>(new Map()),
        selectedOptionSignal: signal<number | null>(null),
        wordFormationInputSignal: signal<string>(''),
        loadingSignal: signal<boolean>(false),
        submittingSignal: signal<boolean>(false),
        errorSignal: signal<string | null>(null),
        completedResultSignal: signal<{ level: string; route: string[]; state?: unknown } | null>(null),
        currentQuestionSignal: signal(mockMcQuestion),
        progressSignal: signal<number>(0),
        isLastQuestionSignal: signal<boolean>(false),
        isFirstQuestionSignal: signal<boolean>(true),
        canProceedSignal: signal<boolean>(false)
      }
    );

    facadeMock.splitByGap.and.callFake((text: string) => {
      const parts = text.split('___');
      return { before: parts[0] || '', after: parts[1] || '' };
    });

    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);
    activatedRouteMock = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.callFake((key: string): string | null => key === 'level' ? 'b2-fce' : null)
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [
        LanguageTestViewComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' }
        })
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: LanguageTestFacadeService, useValue: facadeMock },
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
    it('should call facade.loadTest for valid level', () => {
      TestBed.runInInjectionContext(() => {
        component.ngOnInit();
      });

      expect(facadeMock.loadTest).toHaveBeenCalledWith('b2-fce');
    });

    it('should redirect to /language-test for invalid level', () => {
      activatedRouteMock.snapshot.paramMap.get.and.callFake(
        (key: string): string | null => key === 'level' ? 'invalid-level' : null
      );

      TestBed.runInInjectionContext(() => {
        component.ngOnInit();
      });

      expect(routerMock.navigate).toHaveBeenCalledWith(['/language-test']);
      expect(facadeMock.loadTest).not.toHaveBeenCalled();
    });

    it('should redirect when level is null', () => {
      activatedRouteMock.snapshot.paramMap.get.and.returnValue(null);

      TestBed.runInInjectionContext(() => {
        component.ngOnInit();
      });

      expect(routerMock.navigate).toHaveBeenCalledWith(['/language-test']);
      expect(facadeMock.loadTest).not.toHaveBeenCalled();
    });
  });

  describe('onKeydown', () => {
    it('should call facade.handleKeydown and preventDefault when returns true', () => {
      facadeMock.handleKeydown.and.returnValue(true);
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: '2' });
      spyOn(event, 'preventDefault');

      component.onKeydown(event);

      expect(facadeMock.handleKeydown).toHaveBeenCalledWith('2');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not call preventDefault when handleKeydown returns false', () => {
      facadeMock.handleKeydown.and.returnValue(false);
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: '5' });
      spyOn(event, 'preventDefault');

      component.onKeydown(event);

      expect(facadeMock.handleKeydown).toHaveBeenCalledWith('5');
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('next', () => {
    it('should delegate to facade.next()', () => {
      component.next();

      expect(facadeMock.next).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should call facade.reset()', () => {
      component.ngOnDestroy();

      expect(facadeMock.reset).toHaveBeenCalled();
    });
  });
});
