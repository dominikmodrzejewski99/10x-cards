import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { QuizQuestionComponent } from './quiz-question.component';
import { FlashcardDTO, QuizAnswer, QuizQuestion } from '../../../../types';

describe('QuizQuestionComponent', () => {
  let component: QuizQuestionComponent;
  let fixture: ComponentFixture<QuizQuestionComponent>;
  let componentRef: ComponentRef<QuizQuestionComponent>;

  const mockFlashcard: FlashcardDTO = {
    id: 1,
    front: 'dog',
    back: 'pies',
    front_image_url: null,
    back_audio_url: null,
    front_language: 'en',
    back_language: 'pl',
    source: 'manual',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-123',
    generation_id: null,
    set_id: 10
  };

  const mockWrittenQuestion: QuizQuestion = {
    id: 1,
    type: 'written',
    questionText: 'Przetlumacz: dog',
    questionImageUrl: null,
    correctAnswer: 'pies',
    sourceFlashcard: mockFlashcard
  };

  const mockMultipleChoiceQuestion: QuizQuestion = {
    id: 2,
    type: 'multiple-choice',
    questionText: 'Wybierz poprawne tlumaczenie: cat',
    questionImageUrl: null,
    correctAnswer: 'kot',
    options: ['pies', 'kot', 'ryba', 'ptak'],
    sourceFlashcard: { ...mockFlashcard, id: 2, front: 'cat', back: 'kot' }
  };

  const mockTrueFalseQuestion: QuizQuestion = {
    id: 3,
    type: 'true-false',
    questionText: 'Czy to poprawne tlumaczenie: bird?',
    questionImageUrl: null,
    correctAnswer: 'ptak',
    trueFalsePairing: { shown: 'ptak', isCorrect: true },
    sourceFlashcard: { ...mockFlashcard, id: 3, front: 'bird', back: 'ptak' }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizQuestionComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(QuizQuestionComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('question', mockWrittenQuestion);
    componentRef.setInput('currentIndex', 0);
    componentRef.setInput('totalQuestions', 10);

    fixture.detectChanges();
  });

  describe('tworzenie komponentu', () => {
    it('powinien zostac utworzony', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('progressPercentSignal', () => {
    it('powinien obliczac procent postepu poprawnie', () => {
      componentRef.setInput('currentIndex', 3);
      componentRef.setInput('totalQuestions', 10);
      fixture.detectChanges();

      const result: number = component.progressPercentSignal();
      expect(result).toBe(30);
    });

    it('powinien zwracac 0 gdy totalQuestions wynosi 0', () => {
      componentRef.setInput('currentIndex', 0);
      componentRef.setInput('totalQuestions', 0);
      fixture.detectChanges();

      const result: number = component.progressPercentSignal();
      expect(result).toBe(0);
    });

    it('powinien zaokraglac wynik do liczby calkowitej', () => {
      componentRef.setInput('currentIndex', 1);
      componentRef.setInput('totalQuestions', 3);
      fixture.detectChanges();

      const result: number = component.progressPercentSignal();
      expect(result).toBe(33);
    });
  });

  describe('onCheckWritten', () => {
    it('powinien ustawic isAnswered na true i isCorrect na true dla poprawnej odpowiedzi', () => {
      component.writtenAnswerSignal.set('pies');

      component.onCheckWritten();

      expect(component.isAnsweredSignal()).toBeTrue();
      expect(component.isCorrectSignal()).toBeTrue();
    });

    it('powinien ustawic isCorrect na false dla blednej odpowiedzi', () => {
      component.writtenAnswerSignal.set('kot');

      component.onCheckWritten();

      expect(component.isAnsweredSignal()).toBeTrue();
      expect(component.isCorrectSignal()).toBeFalse();
    });

    it('powinien obslugiwac odpowiedzi z wieloma znaczeniami oddzielonymi srednikiem', () => {
      const questionWithMultipleMeanings: QuizQuestion = {
        ...mockWrittenQuestion,
        correctAnswer: 'pies; psiak; piesek'
      };
      componentRef.setInput('question', questionWithMultipleMeanings);
      fixture.detectChanges();

      component.writtenAnswerSignal.set('psiak');

      component.onCheckWritten();

      expect(component.isCorrectSignal()).toBeTrue();
    });

    it('powinien ignorowac wielkosc liter przy porownywaniu', () => {
      component.writtenAnswerSignal.set('PIES');

      component.onCheckWritten();

      expect(component.isCorrectSignal()).toBeTrue();
    });

    it('powinien ignorowac biale znaki na poczatku i koncu odpowiedzi', () => {
      component.writtenAnswerSignal.set('  pies  ');

      component.onCheckWritten();

      expect(component.isCorrectSignal()).toBeTrue();
    });

    it('nie powinien nic robic jesli pytanie jest juz odpowiedziane', () => {
      component.writtenAnswerSignal.set('pies');
      component.onCheckWritten();

      expect(component.isCorrectSignal()).toBeTrue();

      component.writtenAnswerSignal.set('kot');
      component.onCheckWritten();

      expect(component.isCorrectSignal()).toBeTrue();
    });
  });

  describe('onSelectOption', () => {
    beforeEach(() => {
      componentRef.setInput('question', mockMultipleChoiceQuestion);
      fixture.detectChanges();
    });

    it('powinien ustawic poprawny stan dla wlasciwej opcji', () => {
      component.onSelectOption('kot');

      expect(component.isAnsweredSignal()).toBeTrue();
      expect(component.isCorrectSignal()).toBeTrue();
      expect(component.selectedOptionSignal()).toBe('kot');
    });

    it('powinien ustawic bledny stan dla zlej opcji', () => {
      component.onSelectOption('pies');

      expect(component.isAnsweredSignal()).toBeTrue();
      expect(component.isCorrectSignal()).toBeFalse();
      expect(component.selectedOptionSignal()).toBe('pies');
    });

    it('nie powinien nic robic jesli pytanie jest juz odpowiedziane', () => {
      component.onSelectOption('kot');

      component.onSelectOption('pies');

      expect(component.selectedOptionSignal()).toBe('kot');
      expect(component.isCorrectSignal()).toBeTrue();
    });
  });

  describe('onSelectTrueFalse', () => {
    beforeEach(() => {
      componentRef.setInput('question', mockTrueFalseQuestion);
      fixture.detectChanges();
    });

    it('powinien ustawic poprawny stan gdy uzytkownik wybierze prawidlowa wartosc (true)', () => {
      component.onSelectTrueFalse(true);

      expect(component.isAnsweredSignal()).toBeTrue();
      expect(component.isCorrectSignal()).toBeTrue();
      expect(component.selectedTrueFalseSignal()).toBeTrue();
    });

    it('powinien ustawic bledny stan gdy uzytkownik wybierze zla wartosc (false)', () => {
      component.onSelectTrueFalse(false);

      expect(component.isAnsweredSignal()).toBeTrue();
      expect(component.isCorrectSignal()).toBeFalse();
      expect(component.selectedTrueFalseSignal()).toBeFalse();
    });

    it('powinien prawidlowo obslugiwac pytanie z isCorrect=false', () => {
      const falseQuestion: QuizQuestion = {
        ...mockTrueFalseQuestion,
        trueFalsePairing: { shown: 'ryba', isCorrect: false }
      };
      componentRef.setInput('question', falseQuestion);
      fixture.detectChanges();

      component.onSelectTrueFalse(false);

      expect(component.isCorrectSignal()).toBeTrue();
    });

    it('nie powinien nic robic jesli pytanie jest juz odpowiedziane', () => {
      component.onSelectTrueFalse(true);

      component.onSelectTrueFalse(false);

      expect(component.selectedTrueFalseSignal()).toBeTrue();
      expect(component.isCorrectSignal()).toBeTrue();
    });
  });

  describe('onNext', () => {
    it('powinien emitowac QuizAnswer z poprawnymi danymi dla pytania pisemnego', () => {
      component.writtenAnswerSignal.set('pies');
      component.onCheckWritten();

      const emitSpy: jasmine.Spy = spyOn(component.answerSubmitted, 'emit');

      component.onNext();

      const expectedAnswer: QuizAnswer = {
        questionId: 1,
        userAnswer: 'pies',
        isCorrect: true,
        correctAnswer: 'pies',
        questionText: 'Przetlumacz: dog',
        timeMs: 0
      };
      expect(emitSpy).toHaveBeenCalledWith(expectedAnswer);
    });

    it('powinien emitowac QuizAnswer z poprawnymi danymi dla pytania wielokrotnego wyboru', () => {
      componentRef.setInput('question', mockMultipleChoiceQuestion);
      fixture.detectChanges();

      component.onSelectOption('kot');

      const emitSpy: jasmine.Spy = spyOn(component.answerSubmitted, 'emit');

      component.onNext();

      const expectedAnswer: QuizAnswer = {
        questionId: 2,
        userAnswer: 'kot',
        isCorrect: true,
        correctAnswer: 'kot',
        questionText: 'Wybierz poprawne tlumaczenie: cat',
        timeMs: 0
      };
      expect(emitSpy).toHaveBeenCalledWith(expectedAnswer);
    });

    it('powinien emitowac QuizAnswer z "Prawda" dla true-false gdy wybrano true', () => {
      componentRef.setInput('question', mockTrueFalseQuestion);
      fixture.detectChanges();

      component.onSelectTrueFalse(true);

      const emitSpy: jasmine.Spy = spyOn(component.answerSubmitted, 'emit');

      component.onNext();

      const emittedAnswer: QuizAnswer = emitSpy.calls.first().args[0] as QuizAnswer;
      expect(emittedAnswer.userAnswer).toBe('Prawda');
      expect(emittedAnswer.questionId).toBe(3);
    });

    it('powinien emitowac QuizAnswer z "Falsz" dla true-false gdy wybrano false', () => {
      componentRef.setInput('question', mockTrueFalseQuestion);
      fixture.detectChanges();

      component.onSelectTrueFalse(false);

      const emitSpy: jasmine.Spy = spyOn(component.answerSubmitted, 'emit');

      component.onNext();

      const emittedAnswer: QuizAnswer = emitSpy.calls.first().args[0] as QuizAnswer;
      expect(emittedAnswer.userAnswer).toBe('Fałsz');
    });

    it('powinien zresetowac stan po wywolaniu', () => {
      component.writtenAnswerSignal.set('pies');
      component.onCheckWritten();

      spyOn(component.answerSubmitted, 'emit');

      component.onNext();

      expect(component.writtenAnswerSignal()).toBe('');
      expect(component.selectedOptionSignal()).toBeNull();
      expect(component.selectedTrueFalseSignal()).toBeNull();
      expect(component.isAnsweredSignal()).toBeFalse();
      expect(component.isCorrectSignal()).toBeNull();
    });
  });

  describe('onKeydown', () => {
    it('powinien wywolac onCheckWritten po nacisnieciu Enter gdy pytanie pisemne nie jest jeszcze odpowiedziane', () => {
      const checkSpy: jasmine.Spy = spyOn(component, 'onCheckWritten');
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: 'Enter' });

      component.onKeydown(event);

      expect(checkSpy).toHaveBeenCalled();
    });

    it('powinien wywolac onNext po nacisnieciu Enter gdy pytanie jest juz odpowiedziane', () => {
      component.writtenAnswerSignal.set('pies');
      component.onCheckWritten();

      const nextSpy: jasmine.Spy = spyOn(component, 'onNext');
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: 'Enter' });

      component.onKeydown(event);

      expect(nextSpy).toHaveBeenCalled();
    });

    it('nie powinien nic robic dla klawiszy innych niz Enter', () => {
      const checkSpy: jasmine.Spy = spyOn(component, 'onCheckWritten');
      const nextSpy: jasmine.Spy = spyOn(component, 'onNext');
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: 'Space' });

      component.onKeydown(event);

      expect(checkSpy).not.toHaveBeenCalled();
      expect(nextSpy).not.toHaveBeenCalled();
    });

    it('nie powinien wywolac onCheckWritten dla pytania wielokrotnego wyboru gdy nie jest odpowiedziane', () => {
      componentRef.setInput('question', mockMultipleChoiceQuestion);
      fixture.detectChanges();

      const checkSpy: jasmine.Spy = spyOn(component, 'onCheckWritten');
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: 'Enter' });

      component.onKeydown(event);

      expect(checkSpy).not.toHaveBeenCalled();
    });
  });

  describe('getOptionClass', () => {
    beforeEach(() => {
      componentRef.setInput('question', mockMultipleChoiceQuestion);
      fixture.detectChanges();
    });

    it('powinien zwracac pusty string gdy pytanie nie jest jeszcze odpowiedziane', () => {
      const result: string = component.getOptionClass('kot');
      expect(result).toBe('');
    });

    it('powinien zwracac klase "--correct" dla poprawnej opcji po odpowiedzi', () => {
      component.onSelectOption('kot');

      const result: string = component.getOptionClass('kot');
      expect(result).toBe('quiz-question__option--correct');
    });

    it('powinien zwracac klase "--wrong" dla wybranej blednej opcji', () => {
      component.onSelectOption('pies');

      const result: string = component.getOptionClass('pies');
      expect(result).toBe('quiz-question__option--wrong');
    });

    it('powinien zwracac klase "--dimmed" dla niewybranej blednej opcji', () => {
      component.onSelectOption('pies');

      const result: string = component.getOptionClass('ryba');
      expect(result).toBe('quiz-question__option--dimmed');
    });

    it('powinien zwracac klase "--correct" dla poprawnej opcji nawet jesli wybrano inna', () => {
      component.onSelectOption('pies');

      const result: string = component.getOptionClass('kot');
      expect(result).toBe('quiz-question__option--correct');
    });
  });
});
