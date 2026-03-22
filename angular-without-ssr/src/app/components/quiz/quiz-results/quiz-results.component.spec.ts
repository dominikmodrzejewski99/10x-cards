import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { QuizResultsComponent } from './quiz-results.component';
import { QuizResult, QuizAnswer } from '../../../../types';

function createMockAnswer(overrides: Partial<QuizAnswer> = {}): QuizAnswer {
  return {
    questionId: 1,
    userAnswer: 'odpowiedz',
    isCorrect: true,
    correctAnswer: 'odpowiedz',
    questionText: 'Przykładowe pytanie?',
    timeMs: 3000,
    ...overrides,
  };
}

function createMockResult(overrides: Partial<QuizResult> = {}): QuizResult {
  return {
    totalQuestions: 10,
    correctCount: 7,
    percentage: 70,
    totalTimeMs: 60000,
    answers: [],
    ...overrides,
  };
}

describe('QuizResultsComponent', () => {
  let component: QuizResultsComponent;
  let fixture: ComponentFixture<QuizResultsComponent>;
  let componentRef: ComponentRef<QuizResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizResultsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizResultsComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  function setDefaultInputs(result?: QuizResult, gradeText?: string): void {
    componentRef.setInput('result', result ?? createMockResult());
    componentRef.setInput('gradeText', gradeText ?? 'Dobrze');
    fixture.detectChanges();
  }

  describe('tworzenie komponentu', () => {
    it('powinien zostać utworzony', () => {
      setDefaultInputs();
      expect(component).toBeTruthy();
    });
  });

  describe('wrongAnswersSignal', () => {
    it('powinien zwrócić tylko błędne odpowiedzi', () => {
      const answers: QuizAnswer[] = [
        createMockAnswer({ questionId: 1, isCorrect: true }),
        createMockAnswer({ questionId: 2, isCorrect: false }),
        createMockAnswer({ questionId: 3, isCorrect: false }),
        createMockAnswer({ questionId: 4, isCorrect: true }),
      ];
      setDefaultInputs(createMockResult({ answers, totalQuestions: 4, correctCount: 2 }));

      const wrong: QuizAnswer[] = component.wrongAnswersSignal();

      expect(wrong.length).toBe(2);
      expect(wrong.every((a: QuizAnswer) => !a.isCorrect)).toBeTrue();
    });

    it('powinien zwrócić pustą tablicę, gdy wszystkie odpowiedzi są poprawne', () => {
      const answers: QuizAnswer[] = [
        createMockAnswer({ questionId: 1, isCorrect: true }),
        createMockAnswer({ questionId: 2, isCorrect: true }),
      ];
      setDefaultInputs(createMockResult({ answers, totalQuestions: 2, correctCount: 2 }));

      expect(component.wrongAnswersSignal().length).toBe(0);
    });
  });

  describe('correctAnswersSignal', () => {
    it('powinien zwrócić tylko poprawne odpowiedzi', () => {
      const answers: QuizAnswer[] = [
        createMockAnswer({ questionId: 1, isCorrect: true }),
        createMockAnswer({ questionId: 2, isCorrect: false }),
        createMockAnswer({ questionId: 3, isCorrect: true }),
      ];
      setDefaultInputs(createMockResult({ answers, totalQuestions: 3, correctCount: 2 }));

      const correct: QuizAnswer[] = component.correctAnswersSignal();

      expect(correct.length).toBe(2);
      expect(correct.every((a: QuizAnswer) => a.isCorrect)).toBeTrue();
    });
  });

  describe('hasWrongAnswersSignal', () => {
    it('powinien zwrócić true, gdy są błędne odpowiedzi', () => {
      const answers: QuizAnswer[] = [
        createMockAnswer({ questionId: 1, isCorrect: false }),
      ];
      setDefaultInputs(createMockResult({ answers, totalQuestions: 1, correctCount: 0 }));

      expect(component.hasWrongAnswersSignal()).toBeTrue();
    });

    it('powinien zwrócić false, gdy nie ma błędnych odpowiedzi', () => {
      const answers: QuizAnswer[] = [
        createMockAnswer({ questionId: 1, isCorrect: true }),
      ];
      setDefaultInputs(createMockResult({ answers, totalQuestions: 1, correctCount: 1 }));

      expect(component.hasWrongAnswersSignal()).toBeFalse();
    });
  });

  describe('correctCountSignal i incorrectCountSignal', () => {
    it('powinien poprawnie obliczyć liczbę poprawnych odpowiedzi', () => {
      setDefaultInputs(createMockResult({ totalQuestions: 10, correctCount: 8 }));

      expect(component.correctCountSignal()).toBe(8);
    });

    it('powinien poprawnie obliczyć liczbę błędnych odpowiedzi', () => {
      setDefaultInputs(createMockResult({ totalQuestions: 10, correctCount: 8 }));

      expect(component.incorrectCountSignal()).toBe(2);
    });

    it('powinien zwrócić 0 błędnych, gdy wszystkie odpowiedzi poprawne', () => {
      setDefaultInputs(createMockResult({ totalQuestions: 5, correctCount: 5 }));

      expect(component.incorrectCountSignal()).toBe(0);
    });
  });

  describe('scoreColorSignal', () => {
    it('powinien zwrócić zielony kolor dla wyniku >= 90%', () => {
      setDefaultInputs(createMockResult({ percentage: 95 }));
      expect(component.scoreColorSignal()).toBe('#23b26d');
    });

    it('powinien zwrócić zielony kolor dla wyniku dokładnie 90%', () => {
      setDefaultInputs(createMockResult({ percentage: 90 }));
      expect(component.scoreColorSignal()).toBe('#23b26d');
    });

    it('powinien zwrócić niebieski kolor dla wyniku >= 70% i < 90%', () => {
      setDefaultInputs(createMockResult({ percentage: 75 }));
      expect(component.scoreColorSignal()).toBe('#4255ff');
    });

    it('powinien zwrócić niebieski kolor dla wyniku dokładnie 70%', () => {
      setDefaultInputs(createMockResult({ percentage: 70 }));
      expect(component.scoreColorSignal()).toBe('#4255ff');
    });

    it('powinien zwrócić pomarańczowy kolor dla wyniku >= 50% i < 70%', () => {
      setDefaultInputs(createMockResult({ percentage: 55 }));
      expect(component.scoreColorSignal()).toBe('#f5a623');
    });

    it('powinien zwrócić pomarańczowy kolor dla wyniku dokładnie 50%', () => {
      setDefaultInputs(createMockResult({ percentage: 50 }));
      expect(component.scoreColorSignal()).toBe('#f5a623');
    });

    it('powinien zwrócić czerwony kolor dla wyniku < 50%', () => {
      setDefaultInputs(createMockResult({ percentage: 30 }));
      expect(component.scoreColorSignal()).toBe('#ff6240');
    });

    it('powinien zwrócić czerwony kolor dla wyniku 0%', () => {
      setDefaultInputs(createMockResult({ percentage: 0 }));
      expect(component.scoreColorSignal()).toBe('#ff6240');
    });
  });

  describe('ringDashSignal', () => {
    it('powinien obliczyć stroke-dasharray na podstawie procentu', () => {
      setDefaultInputs(createMockResult({ percentage: 50 }));

      const circumference: number = 2 * Math.PI * 54;
      const expectedFilled: number = (50 / 100) * circumference;
      const expected: string = `${expectedFilled} ${circumference}`;

      expect(component.ringDashSignal()).toBe(expected);
    });

    it('powinien zwrócić 0 filled dla 0%', () => {
      setDefaultInputs(createMockResult({ percentage: 0 }));

      const circumference: number = 2 * Math.PI * 54;
      const expected: string = `0 ${circumference}`;

      expect(component.ringDashSignal()).toBe(expected);
    });

    it('powinien zwrócić pełne wypełnienie dla 100%', () => {
      setDefaultInputs(createMockResult({ percentage: 100 }));

      const circumference: number = 2 * Math.PI * 54;
      const expected: string = `${circumference} ${circumference}`;

      expect(component.ringDashSignal()).toBe(expected);
    });
  });

  describe('totalTimeTextSignal', () => {
    it('powinien wyświetlić tylko sekundy, gdy czas < 1 minuty', () => {
      setDefaultInputs(createMockResult({ totalTimeMs: 45000 }));

      expect(component.totalTimeTextSignal()).toBe('45 sek.');
    });

    it('powinien wyświetlić minuty i sekundy, gdy czas >= 1 minuty', () => {
      setDefaultInputs(createMockResult({ totalTimeMs: 125000 }));

      expect(component.totalTimeTextSignal()).toBe('2 min. 5 sek.');
    });

    it('powinien wyświetlić 0 sekund dla 0 ms', () => {
      setDefaultInputs(createMockResult({ totalTimeMs: 0 }));

      expect(component.totalTimeTextSignal()).toBe('0 sek.');
    });

    it('powinien wyświetlić minuty i 0 sekund dla dokładnie pełnej minuty', () => {
      setDefaultInputs(createMockResult({ totalTimeMs: 60000 }));

      expect(component.totalTimeTextSignal()).toBe('1 min. 0 sek.');
    });
  });

  describe('slowestAnswersSignal', () => {
    it('powinien zwrócić 3 najwolniejsze odpowiedzi posortowane malejąco wg czasu', () => {
      const answers: QuizAnswer[] = [
        createMockAnswer({ questionId: 1, timeMs: 1000 }),
        createMockAnswer({ questionId: 2, timeMs: 5000 }),
        createMockAnswer({ questionId: 3, timeMs: 3000 }),
        createMockAnswer({ questionId: 4, timeMs: 8000 }),
        createMockAnswer({ questionId: 5, timeMs: 2000 }),
      ];
      setDefaultInputs(createMockResult({ answers, totalQuestions: 5 }));

      const slowest: QuizAnswer[] = component.slowestAnswersSignal();

      expect(slowest.length).toBe(3);
      expect(slowest[0].questionId).toBe(4);
      expect(slowest[1].questionId).toBe(2);
      expect(slowest[2].questionId).toBe(3);
    });

    it('powinien zwrócić wszystkie odpowiedzi, gdy jest ich mniej niż 3', () => {
      const answers: QuizAnswer[] = [
        createMockAnswer({ questionId: 1, timeMs: 2000 }),
        createMockAnswer({ questionId: 2, timeMs: 4000 }),
      ];
      setDefaultInputs(createMockResult({ answers, totalQuestions: 2 }));

      const slowest: QuizAnswer[] = component.slowestAnswersSignal();

      expect(slowest.length).toBe(2);
      expect(slowest[0].questionId).toBe(2);
      expect(slowest[1].questionId).toBe(1);
    });

    it('powinien zwrócić pustą tablicę, gdy brak odpowiedzi', () => {
      setDefaultInputs(createMockResult({ answers: [], totalQuestions: 0 }));

      expect(component.slowestAnswersSignal().length).toBe(0);
    });
  });

  describe('starredIdsSignal i toggleStarred', () => {
    beforeEach(() => {
      setDefaultInputs();
    });

    it('powinien dodać ID do wyróżnionych po wywołaniu toggleStarred', () => {
      component.toggleStarred(5);

      expect(component.starredIdsSignal().has(5)).toBeTrue();
    });

    it('powinien usunąć ID z wyróżnionych po ponownym wywołaniu toggleStarred', () => {
      component.toggleStarred(5);
      component.toggleStarred(5);

      expect(component.starredIdsSignal().has(5)).toBeFalse();
    });

    it('powinien obsługiwać wiele wyróżnionych ID jednocześnie', () => {
      component.toggleStarred(1);
      component.toggleStarred(3);
      component.toggleStarred(7);

      const starred: Set<number> = component.starredIdsSignal();

      expect(starred.size).toBe(3);
      expect(starred.has(1)).toBeTrue();
      expect(starred.has(3)).toBeTrue();
      expect(starred.has(7)).toBeTrue();
    });
  });

  describe('isStarred', () => {
    beforeEach(() => {
      setDefaultInputs();
    });

    it('powinien zwrócić true dla wyróżnionego ID', () => {
      component.toggleStarred(10);

      expect(component.isStarred(10)).toBeTrue();
    });

    it('powinien zwrócić false dla niewyróżnionego ID', () => {
      expect(component.isStarred(99)).toBeFalse();
    });
  });

  describe('starredCountSignal i hasStarredSignal', () => {
    beforeEach(() => {
      setDefaultInputs();
    });

    it('powinien zwrócić liczbę wyróżnionych odpowiedzi', () => {
      component.toggleStarred(1);
      component.toggleStarred(2);
      component.toggleStarred(3);

      expect(component.starredCountSignal()).toBe(3);
    });

    it('powinien zwrócić 0, gdy brak wyróżnionych', () => {
      expect(component.starredCountSignal()).toBe(0);
    });

    it('powinien zwrócić true z hasStarredSignal, gdy są wyróżnione', () => {
      component.toggleStarred(1);

      expect(component.hasStarredSignal()).toBeTrue();
    });

    it('powinien zwrócić false z hasStarredSignal, gdy brak wyróżnionych', () => {
      expect(component.hasStarredSignal()).toBeFalse();
    });

    it('powinien zaktualizować liczbę po usunięciu wyróżnienia', () => {
      component.toggleStarred(1);
      component.toggleStarred(2);
      component.toggleStarred(1);

      expect(component.starredCountSignal()).toBe(1);
    });
  });

  describe('formatTimeMs', () => {
    beforeEach(() => {
      setDefaultInputs();
    });

    it('powinien sformatować milisekundy na sekundy z jednym miejscem po przecinku', () => {
      const result: string = component.formatTimeMs(3500);

      expect(result).toBe('3.5 sek.');
    });

    it('powinien sformatować 0 ms', () => {
      const result: string = component.formatTimeMs(0);

      expect(result).toBe('0 sek.');
    });

    it('powinien sformatować pełne sekundy bez dziesiętnych', () => {
      const result: string = component.formatTimeMs(2000);

      expect(result).toBe('2 sek.');
    });

    it('powinien zaokrąglić do jednego miejsca po przecinku', () => {
      const result: string = component.formatTimeMs(1250);

      expect(result).toBe('1.3 sek.');
    });
  });

  describe('allAnswersExpandedSignal', () => {
    it('powinien domyślnie zwracać true', () => {
      setDefaultInputs();

      expect(component.allAnswersExpandedSignal()).toBeTrue();
    });

    it('powinien przełączać wartość po wywołaniu toggleAllAnswersExpanded', () => {
      setDefaultInputs();

      component.toggleAllAnswersExpanded();

      expect(component.allAnswersExpandedSignal()).toBeFalse();
    });

    it('powinien wrócić do true po dwukrotnym przełączeniu', () => {
      setDefaultInputs();

      component.toggleAllAnswersExpanded();
      component.toggleAllAnswersExpanded();

      expect(component.allAnswersExpandedSignal()).toBeTrue();
    });
  });

  describe('zdarzenia wyjściowe (output events)', () => {
    beforeEach(() => {
      setDefaultInputs();
    });

    it('powinien wyemitować retry po wywołaniu onRetry', () => {
      const retrySpy: jasmine.Spy = jasmine.createSpy('retrySpy');
      component.retry.subscribe(retrySpy);

      component.onRetry();

      expect(retrySpy).toHaveBeenCalledTimes(1);
    });

    it('powinien wyemitować retryWrong po wywołaniu onRetryWrong', () => {
      const retryWrongSpy: jasmine.Spy = jasmine.createSpy('retryWrongSpy');
      component.retryWrong.subscribe(retryWrongSpy);

      component.onRetryWrong();

      expect(retryWrongSpy).toHaveBeenCalledTimes(1);
    });

    it('powinien wyemitować retryStarred z tablicą wyróżnionych ID', () => {
      const retryStarredSpy: jasmine.Spy = jasmine.createSpy('retryStarredSpy');
      component.retryStarred.subscribe(retryStarredSpy);

      component.toggleStarred(2);
      component.toggleStarred(5);
      component.toggleStarred(8);

      component.onRetryStarred();

      expect(retryStarredSpy).toHaveBeenCalledTimes(1);
      const emittedIds: number[] = retryStarredSpy.calls.first().args[0] as number[];
      expect(emittedIds.length).toBe(3);
      expect(emittedIds).toContain(2);
      expect(emittedIds).toContain(5);
      expect(emittedIds).toContain(8);
    });

    it('powinien wyemitować retryStarred z pustą tablicą, gdy brak wyróżnionych', () => {
      const retryStarredSpy: jasmine.Spy = jasmine.createSpy('retryStarredSpy');
      component.retryStarred.subscribe(retryStarredSpy);

      component.onRetryStarred();

      expect(retryStarredSpy).toHaveBeenCalledWith([]);
    });

    it('powinien wyemitować goBack po wywołaniu onGoBack', () => {
      const goBackSpy: jasmine.Spy = jasmine.createSpy('goBackSpy');
      component.goBack.subscribe(goBackSpy);

      component.onGoBack();

      expect(goBackSpy).toHaveBeenCalledTimes(1);
    });
  });
});
