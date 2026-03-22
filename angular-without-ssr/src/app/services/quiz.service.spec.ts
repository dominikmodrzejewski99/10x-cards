import {TestBed} from '@angular/core/testing';
import {QuizService} from './quiz.service';
import {FlashcardDTO, QuizAnswer, QuizConfig, QuizQuestion, QuizQuestionType, QuizResult} from '../../types';

describe('QuizService', () => {
  let service: QuizService;

  const mockFlashcard = (id: number, front: string, back: string, frontImageUrl: string | null = null): FlashcardDTO => ({
    id,
    front,
    back,
    front_image_url: frontImageUrl,
    back_audio_url: null,
    front_language: 'en',
    back_language: 'pl',
    source: 'manual',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1',
    generation_id: null,
    set_id: 1
  });

  const mockFlashcards: FlashcardDTO[] = [
    mockFlashcard(1, 'dog', 'pies'),
    mockFlashcard(2, 'cat', 'kot'),
    mockFlashcard(3, 'bird', 'ptak'),
    mockFlashcard(4, 'fish', 'ryba'),
    mockFlashcard(5, 'horse', 'kon')
  ];

  const mockConfig: QuizConfig = {
    setId: 1,
    questionCount: 3,
    questionTypes: ['written', 'multiple-choice', 'true-false'],
    reversed: false
  };

  const mockAnswer = (
    questionId: number,
    isCorrect: boolean,
    timeMs: number,
    userAnswer: string = 'answer',
    correctAnswer: string = 'correct',
    questionText: string = 'question'
  ): QuizAnswer => ({
    questionId,
    userAnswer,
    isCorrect,
    correctAnswer,
    questionText,
    timeMs
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [QuizService]
    });
    service = TestBed.inject(QuizService);
  });

  it('powinien zostac utworzony', () => {
    expect(service).toBeTruthy();
  });

  // ==================== generateQuestions ====================

  describe('generateQuestions', () => {
    it('powinien wygenerowac pytania o podanej liczbie', () => {
      const questions: QuizQuestion[] = service.generateQuestions(mockFlashcards, mockConfig);

      expect(questions.length).toBe(3);
    });

    it('powinien wygenerowac wszystkie pytania gdy questionCount = "all"', () => {
      const allConfig: QuizConfig = { ...mockConfig, questionCount: 'all' };
      const questions: QuizQuestion[] = service.generateQuestions(mockFlashcards, allConfig);

      expect(questions.length).toBe(mockFlashcards.length);
    });

    it('powinien ograniczyc liczbe pytan do liczby dostepnych fiszek', () => {
      const bigConfig: QuizConfig = { ...mockConfig, questionCount: 100 };
      const questions: QuizQuestion[] = service.generateQuestions(mockFlashcards, bigConfig);

      expect(questions.length).toBe(mockFlashcards.length);
    });

    it('powinien zwrocic pusta tablice dla pustej listy fiszek', () => {
      const questions: QuizQuestion[] = service.generateQuestions([], mockConfig);

      expect(questions.length).toBe(0);
    });

    it('powinien przypisac poprawny typ pytania z dozwolonych typow', () => {
      const singleTypeConfig: QuizConfig = { ...mockConfig, questionTypes: ['written'] };
      const questions: QuizQuestion[] = service.generateQuestions(mockFlashcards, singleTypeConfig);

      questions.forEach((q: QuizQuestion) => {
        expect(q.type).toBe('written');
      });
    });

    it('powinien przypisac typy pytan tylko z listy dozwolonych', () => {
      const allowedTypes: QuizQuestionType[] = ['written', 'multiple-choice'];
      const config: QuizConfig = { ...mockConfig, questionCount: 'all', questionTypes: allowedTypes };
      const questions: QuizQuestion[] = service.generateQuestions(mockFlashcards, config);

      questions.forEach((q: QuizQuestion) => {
        expect(allowedTypes).toContain(q.type);
      });
    });

    it('powinien ustawic questionText jako front a correctAnswer jako back gdy reversed = false', () => {
      const singleConfig: QuizConfig = { ...mockConfig, questionCount: 1, questionTypes: ['written'] };
      const cards: FlashcardDTO[] = [mockFlashcard(1, 'hello', 'czesc')];
      const questions: QuizQuestion[] = service.generateQuestions(cards, singleConfig);

      expect(questions[0].questionText).toBe('hello');
      expect(questions[0].correctAnswer).toBe('czesc');
    });

    it('powinien ustawic questionText jako back a correctAnswer jako front gdy reversed = true', () => {
      const reversedConfig: QuizConfig = { ...mockConfig, questionCount: 1, questionTypes: ['written'], reversed: true };
      const cards: FlashcardDTO[] = [mockFlashcard(1, 'hello', 'czesc')];
      const questions: QuizQuestion[] = service.generateQuestions(cards, reversedConfig);

      expect(questions[0].questionText).toBe('czesc');
      expect(questions[0].correctAnswer).toBe('hello');
    });

    it('powinien ustawic questionImageUrl z front_image_url gdy reversed = false', () => {
      const cards: FlashcardDTO[] = [mockFlashcard(1, 'dog', 'pies', 'http://img.test/dog.png')];
      const config: QuizConfig = { ...mockConfig, questionCount: 1, questionTypes: ['written'], reversed: false };
      const questions: QuizQuestion[] = service.generateQuestions(cards, config);

      expect(questions[0].questionImageUrl).toBe('http://img.test/dog.png');
    });

    it('powinien ustawic questionImageUrl na null gdy reversed = true', () => {
      const cards: FlashcardDTO[] = [mockFlashcard(1, 'dog', 'pies', 'http://img.test/dog.png')];
      const config: QuizConfig = { ...mockConfig, questionCount: 1, questionTypes: ['written'], reversed: true };
      const questions: QuizQuestion[] = service.generateQuestions(cards, config);

      expect(questions[0].questionImageUrl).toBeNull();
    });

    it('powinien zachowac referencje do sourceFlashcard', () => {
      const cards: FlashcardDTO[] = [mockFlashcard(1, 'dog', 'pies')];
      const config: QuizConfig = { ...mockConfig, questionCount: 1, questionTypes: ['written'] };
      const questions: QuizQuestion[] = service.generateQuestions(cards, config);

      expect(questions[0].sourceFlashcard).toEqual(cards[0]);
    });

    describe('multiple-choice', () => {
      it('powinien zawierac dokladnie 4 opcje dla pytania wielokrotnego wyboru', () => {
        const config: QuizConfig = { ...mockConfig, questionCount: 'all', questionTypes: ['multiple-choice'] };
        const questions: QuizQuestion[] = service.generateQuestions(mockFlashcards, config);

        questions.forEach((q: QuizQuestion) => {
          expect(q.options).toBeDefined();
          expect(q.options!.length).toBe(4);
        });
      });

      it('powinien zawierac poprawna odpowiedz wsrod opcji', () => {
        const config: QuizConfig = { ...mockConfig, questionCount: 'all', questionTypes: ['multiple-choice'] };
        const questions: QuizQuestion[] = service.generateQuestions(mockFlashcards, config);

        questions.forEach((q: QuizQuestion) => {
          expect(q.options).toContain(q.correctAnswer);
        });
      });

      it('powinien wypelnic brakujace opcje znakiem "—" gdy za malo fiszek', () => {
        const fewCards: FlashcardDTO[] = [mockFlashcard(1, 'dog', 'pies')];
        const config: QuizConfig = { ...mockConfig, questionCount: 1, questionTypes: ['multiple-choice'] };
        const questions: QuizQuestion[] = service.generateQuestions(fewCards, config);

        const dashCount: number = questions[0].options!.filter((o: string) => o === '\u2014').length;
        expect(dashCount).toBe(3);
      });
    });

    describe('true-false', () => {
      it('powinien zawierac obiekt trueFalsePairing dla pytania prawda-falsz', () => {
        const config: QuizConfig = { ...mockConfig, questionCount: 'all', questionTypes: ['true-false'] };
        const questions: QuizQuestion[] = service.generateQuestions(mockFlashcards, config);

        questions.forEach((q: QuizQuestion) => {
          expect(q.trueFalsePairing).toBeDefined();
          expect(q.trueFalsePairing!.shown).toBeDefined();
          expect(typeof q.trueFalsePairing!.isCorrect).toBe('boolean');
        });
      });

      it('powinien pokazac poprawna odpowiedz gdy isCorrect = true', () => {
        const config: QuizConfig = { ...mockConfig, questionCount: 'all', questionTypes: ['true-false'] };
        const questions: QuizQuestion[] = service.generateQuestions(mockFlashcards, config);

        const correctPairings: QuizQuestion[] = questions.filter(
          (q: QuizQuestion) => q.trueFalsePairing!.isCorrect
        );

        correctPairings.forEach((q: QuizQuestion) => {
          expect(q.trueFalsePairing!.shown).toBe(q.correctAnswer);
        });
      });

      it('powinien zawsze zwrocic poprawne parowanie gdy jest tylko jedna fiszka', () => {
        const singleCard: FlashcardDTO[] = [mockFlashcard(1, 'dog', 'pies')];
        const config: QuizConfig = { ...mockConfig, questionCount: 1, questionTypes: ['true-false'] };

        // Uruchom wiele razy zeby sprawdzic losowy warunek
        for (let i: number = 0; i < 20; i++) {
          const questions: QuizQuestion[] = service.generateQuestions(singleCard, config);
          // Gdy jedna fiszka, brak blednych odpowiedzi w puli -> zawsze isCorrect = true
          // LUB Math.random < 0.5 -> isCorrect true
          // Jezeli isCorrect false -> wrongPool jest pusta -> fallback do isCorrect true
          if (!questions[0].trueFalsePairing!.isCorrect) {
            // Jesli wrongPool jest pusta, powinien wrocic do correct
            // Ale jesli Math.random >= 0.5, wejdzie w galaz wrong, wrongPool pusta -> fallback
            expect(questions[0].trueFalsePairing!.shown).toBe(questions[0].correctAnswer);
            expect(questions[0].trueFalsePairing!.isCorrect).toBeTrue();
          }
        }
      });
    });

    it('powinien przypisac sekwencyjne id pytaniom', () => {
      const config: QuizConfig = { ...mockConfig, questionCount: 'all', questionTypes: ['written'] };
      const questions: QuizQuestion[] = service.generateQuestions(mockFlashcards, config);

      questions.forEach((q: QuizQuestion, index: number) => {
        expect(q.id).toBe(index);
      });
    });

    it('nie powinien modyfikowac oryginalnej tablicy fiszek', () => {
      const originalCards: FlashcardDTO[] = [...mockFlashcards];
      const originalOrder: number[] = originalCards.map((c: FlashcardDTO) => c.id);

      service.generateQuestions(mockFlashcards, mockConfig);

      const currentOrder: number[] = mockFlashcards.map((c: FlashcardDTO) => c.id);
      expect(currentOrder).toEqual(originalOrder);
    });
  });

  // ==================== validateWrittenAnswer ====================

  describe('validateWrittenAnswer', () => {
    it('powinien zwrocic true dla dokladnie pasujacego tekstu', () => {
      const result: boolean = service.validateWrittenAnswer('pies', 'pies');

      expect(result).toBeTrue();
    });

    it('powinien byc niewrazliwy na wielkosc liter', () => {
      const result: boolean = service.validateWrittenAnswer('Pies', 'pies');

      expect(result).toBeTrue();
    });

    it('powinien ignorowac biale znaki na poczatku i koncu', () => {
      const result: boolean = service.validateWrittenAnswer('  pies  ', 'pies');

      expect(result).toBeTrue();
    });

    it('powinien akceptowac dowolne znaczenie z listy oddzielonej srednikami', () => {
      const result1: boolean = service.validateWrittenAnswer('pies', 'pies; czworonog; kundelek');
      const result2: boolean = service.validateWrittenAnswer('czworonog', 'pies; czworonog; kundelek');
      const result3: boolean = service.validateWrittenAnswer('kundelek', 'pies; czworonog; kundelek');

      expect(result1).toBeTrue();
      expect(result2).toBeTrue();
      expect(result3).toBeTrue();
    });

    it('powinien obslugiwac sredniki z roznymi spacjami w poprawnej odpowiedzi', () => {
      const result: boolean = service.validateWrittenAnswer('kot', 'kot;kotek; kocur');

      expect(result).toBeTrue();
    });

    it('powinien zwrocic false dla blednej odpowiedzi', () => {
      const result: boolean = service.validateWrittenAnswer('kot', 'pies');

      expect(result).toBeFalse();
    });

    it('powinien zwrocic false dla pustej odpowiedzi', () => {
      const result: boolean = service.validateWrittenAnswer('', 'pies');

      expect(result).toBeFalse();
    });

    it('powinien zwrocic false dla odpowiedzi skladajacej sie z samych spacji', () => {
      const result: boolean = service.validateWrittenAnswer('   ', 'pies');

      expect(result).toBeFalse();
    });

    it('powinien zwrocic false dla czesciowego dopasowania', () => {
      const result: boolean = service.validateWrittenAnswer('pie', 'pies');

      expect(result).toBeFalse();
    });

    it('powinien poprawnie porownywac wielkosc liter w correctAnswer z srednikami', () => {
      const result: boolean = service.validateWrittenAnswer('PIES', 'Pies; Czworonog');

      expect(result).toBeTrue();
    });
  });

  // ==================== calculateResult ====================

  describe('calculateResult', () => {
    it('powinien poprawnie obliczyc wynik dla mieszanych odpowiedzi', () => {
      const answers: QuizAnswer[] = [
        mockAnswer(1, true, 1000),
        mockAnswer(2, false, 2000),
        mockAnswer(3, true, 1500)
      ];

      const result: QuizResult = service.calculateResult(answers);

      expect(result.totalQuestions).toBe(3);
      expect(result.correctCount).toBe(2);
      expect(result.percentage).toBe(67);
      expect(result.totalTimeMs).toBe(4500);
      expect(result.answers).toBe(answers);
    });

    it('powinien zwrocic 100% dla wszystkich poprawnych odpowiedzi', () => {
      const answers: QuizAnswer[] = [
        mockAnswer(1, true, 1000),
        mockAnswer(2, true, 2000),
        mockAnswer(3, true, 1500)
      ];

      const result: QuizResult = service.calculateResult(answers);

      expect(result.correctCount).toBe(3);
      expect(result.percentage).toBe(100);
    });

    it('powinien zwrocic 0% dla wszystkich blednych odpowiedzi', () => {
      const answers: QuizAnswer[] = [
        mockAnswer(1, false, 1000),
        mockAnswer(2, false, 2000),
        mockAnswer(3, false, 1500)
      ];

      const result: QuizResult = service.calculateResult(answers);

      expect(result.correctCount).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('powinien zwrocic 0% dla pustej tablicy odpowiedzi', () => {
      const answers: QuizAnswer[] = [];

      const result: QuizResult = service.calculateResult(answers);

      expect(result.totalQuestions).toBe(0);
      expect(result.correctCount).toBe(0);
      expect(result.percentage).toBe(0);
      expect(result.totalTimeMs).toBe(0);
    });

    it('powinien poprawnie sumowac calkowity czas', () => {
      const answers: QuizAnswer[] = [
        mockAnswer(1, true, 500),
        mockAnswer(2, true, 750),
        mockAnswer(3, false, 1250)
      ];

      const result: QuizResult = service.calculateResult(answers);

      expect(result.totalTimeMs).toBe(2500);
    });

    it('powinien zaokraglic procent do najblizszej liczby calkowitej', () => {
      const answers: QuizAnswer[] = [
        mockAnswer(1, true, 1000),
        mockAnswer(2, false, 1000),
        mockAnswer(3, false, 1000)
      ];

      const result: QuizResult = service.calculateResult(answers);

      // 1/3 = 33.333... -> zaokraglone do 33
      expect(result.percentage).toBe(33);
    });

    it('powinien zwrocic referencje do oryginalnej tablicy odpowiedzi', () => {
      const answers: QuizAnswer[] = [mockAnswer(1, true, 1000)];

      const result: QuizResult = service.calculateResult(answers);

      expect(result.answers).toBe(answers);
    });

    it('powinien poprawnie obliczyc wynik dla jednej odpowiedzi', () => {
      const answers: QuizAnswer[] = [mockAnswer(1, true, 3000)];

      const result: QuizResult = service.calculateResult(answers);

      expect(result.totalQuestions).toBe(1);
      expect(result.correctCount).toBe(1);
      expect(result.percentage).toBe(100);
      expect(result.totalTimeMs).toBe(3000);
    });
  });

  // ==================== getGradeText ====================

  describe('getGradeText', () => {
    it('powinien zwrocic "Swietnie!" dla wyniku >= 90%', () => {
      expect(service.getGradeText(90)).toBe('Świetnie!');
      expect(service.getGradeText(95)).toBe('Świetnie!');
      expect(service.getGradeText(100)).toBe('Świetnie!');
    });

    it('powinien zwrocic "Dobra robota!" dla wyniku >= 70% i < 90%', () => {
      expect(service.getGradeText(70)).toBe('Dobra robota!');
      expect(service.getGradeText(80)).toBe('Dobra robota!');
      expect(service.getGradeText(89)).toBe('Dobra robota!');
    });

    it('powinien zwrocic "Pocwicz jeszcze" dla wyniku >= 50% i < 70%', () => {
      expect(service.getGradeText(50)).toBe('Poćwicz jeszcze');
      expect(service.getGradeText(60)).toBe('Poćwicz jeszcze');
      expect(service.getGradeText(69)).toBe('Poćwicz jeszcze');
    });

    it('powinien zwrocic "Sprobuj ponownie" dla wyniku < 50%', () => {
      expect(service.getGradeText(0)).toBe('Spróbuj ponownie');
      expect(service.getGradeText(25)).toBe('Spróbuj ponownie');
      expect(service.getGradeText(49)).toBe('Spróbuj ponownie');
    });

    it('powinien poprawnie obslugiwac wartosci graniczne', () => {
      expect(service.getGradeText(90)).toBe('Świetnie!');
      expect(service.getGradeText(89)).toBe('Dobra robota!');
      expect(service.getGradeText(70)).toBe('Dobra robota!');
      expect(service.getGradeText(69)).toBe('Poćwicz jeszcze');
      expect(service.getGradeText(50)).toBe('Poćwicz jeszcze');
      expect(service.getGradeText(49)).toBe('Spróbuj ponownie');
    });
  });

  // ==================== getWrongAnswers ====================

  describe('getWrongAnswers', () => {
    it('powinien zwrocic tylko bledne odpowiedzi', () => {
      const answers: QuizAnswer[] = [
        mockAnswer(1, true, 1000),
        mockAnswer(2, false, 2000),
        mockAnswer(3, true, 1500),
        mockAnswer(4, false, 1000)
      ];

      const wrong: QuizAnswer[] = service.getWrongAnswers(answers);

      expect(wrong.length).toBe(2);
      expect(wrong[0].questionId).toBe(2);
      expect(wrong[1].questionId).toBe(4);
    });

    it('powinien zwrocic pusta tablice gdy wszystkie odpowiedzi sa poprawne', () => {
      const answers: QuizAnswer[] = [
        mockAnswer(1, true, 1000),
        mockAnswer(2, true, 2000)
      ];

      const wrong: QuizAnswer[] = service.getWrongAnswers(answers);

      expect(wrong.length).toBe(0);
    });

    it('powinien zwrocic wszystkie odpowiedzi gdy wszystkie sa bledne', () => {
      const answers: QuizAnswer[] = [
        mockAnswer(1, false, 1000),
        mockAnswer(2, false, 2000),
        mockAnswer(3, false, 1500)
      ];

      const wrong: QuizAnswer[] = service.getWrongAnswers(answers);

      expect(wrong.length).toBe(3);
    });

    it('powinien zwrocic pusta tablice dla pustej tablicy odpowiedzi', () => {
      const wrong: QuizAnswer[] = service.getWrongAnswers([]);

      expect(wrong.length).toBe(0);
    });

    it('powinien zachowac oryginalne obiekty odpowiedzi', () => {
      const answers: QuizAnswer[] = [
        mockAnswer(1, false, 1000, 'moja odpowiedz', 'poprawna', 'pytanie')
      ];

      const wrong: QuizAnswer[] = service.getWrongAnswers(answers);

      expect(wrong[0]).toBe(answers[0]);
      expect(wrong[0].userAnswer).toBe('moja odpowiedz');
      expect(wrong[0].correctAnswer).toBe('poprawna');
    });
  });
});
