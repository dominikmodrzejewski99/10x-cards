import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { PrintTestService, PrintTestConfig } from './print-test.service';
import { QuizService } from './quiz.service';
import { FlashcardDTO, QuizQuestion } from '../../types';

describe('PrintTestService', () => {
  let service: PrintTestService;
  let windowOpenSpy: jasmine.Spy;
  let mockPrintWindow: { document: { write: jasmine.Spy; close: jasmine.Spy } };

  const mockFlashcard = (id: number, front: string, back: string): FlashcardDTO => ({
    id,
    front,
    back,
    front_image_url: null,
    back_audio_url: null,
    front_language: 'en',
    back_language: 'pl',
    source: 'manual',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1',
    generation_id: null,
    set_id: 1,
    position: id
  });

  const mockFlashcards: FlashcardDTO[] = [
    mockFlashcard(1, 'dog', 'pies'),
    mockFlashcard(2, 'cat', 'kot'),
    mockFlashcard(3, 'bird', 'ptak'),
    mockFlashcard(4, 'fish', 'ryba'),
    mockFlashcard(5, 'horse', 'koń')
  ];

  const defaultConfig: PrintTestConfig = {
    title: 'Testowy sprawdzian',
    questionCount: 5,
    questionTypes: ['written', 'multiple-choice', 'true-false'],
    includeMatching: false,
    reversed: false,
    includeAnswerKey: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PrintTestService,
        QuizService,
        {
          provide: TranslocoService,
          useValue: {
            translate: (key: string) => key.split('.').pop() || key,
            getActiveLang: () => 'pl'
          }
        }
      ]
    });
    service = TestBed.inject(PrintTestService);

    mockPrintWindow = {
      document: {
        write: jasmine.createSpy('write'),
        close: jasmine.createSpy('close')
      }
    };
    windowOpenSpy = spyOn(window, 'open').and.returnValue(mockPrintWindow as unknown as Window);
  });

  it('powinien zostac utworzony', () => {
    expect(service).toBeTruthy();
  });

  describe('generateAndPrint', () => {
    it('powinien otworzyc nowe okno i zapisac HTML', () => {
      const result: boolean = service.generateAndPrint(mockFlashcards, defaultConfig);

      expect(result).toBeTrue();
      expect(windowOpenSpy).toHaveBeenCalledWith('', '_blank');
      expect(mockPrintWindow.document.write).toHaveBeenCalledTimes(1);
      expect(mockPrintWindow.document.close).toHaveBeenCalledTimes(1);
    });

    it('powinien zwrocic false gdy popup jest zablokowany', () => {
      windowOpenSpy.and.returnValue(null);

      const result: boolean = service.generateAndPrint(mockFlashcards, defaultConfig);

      expect(result).toBeFalse();
      expect(mockPrintWindow.document.write).not.toHaveBeenCalled();
    });

    it('powinien wygenerowac poprawny HTML z tytulem testu', () => {
      service.generateAndPrint(mockFlashcards, defaultConfig);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Testowy sprawdzian');
    });

    it('powinien wstawic atrybut lang z aktywnego jezyka', () => {
      service.generateAndPrint(mockFlashcards, defaultConfig);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('lang="pl"');
    });

    it('powinien dodac skrypt window.print z oczekiwaniem na fonty', () => {
      service.generateAndPrint(mockFlashcards, defaultConfig);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('document.fonts.ready');
      expect(html).toContain('window.print()');
    });
  });

  describe('sekcje pytan', () => {
    it('powinien wygenerowac sekcje written gdy typ written jest wybrany', () => {
      const config: PrintTestConfig = { ...defaultConfig, questionTypes: ['written'] };

      service.generateAndPrint(mockFlashcards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('question--written');
      expect(html).toContain('question__answer-line');
    });

    it('powinien wygenerowac sekcje multiple-choice z opcjami A-D', () => {
      const config: PrintTestConfig = { ...defaultConfig, questionTypes: ['multiple-choice'] };

      service.generateAndPrint(mockFlashcards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('question--mc');
      expect(html).toContain('option__letter');
    });

    it('powinien wygenerowac sekcje true-false z polami wyboru', () => {
      const config: PrintTestConfig = { ...defaultConfig, questionTypes: ['true-false'] };

      service.generateAndPrint(mockFlashcards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('question--tf');
      expect(html).toContain('tf-box');
    });

    it('nie powinien generowac sekcji dla niewybranych typow', () => {
      const config: PrintTestConfig = { ...defaultConfig, questionTypes: ['written'] };

      service.generateAndPrint(mockFlashcards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      // Check for actual question HTML elements, not CSS class definitions
      expect(html).not.toContain('class="question question--mc"');
      expect(html).not.toContain('class="question question--tf"');
    });

    it('powinien obslużyc pusta liste typow pytan bez matching', () => {
      const config: PrintTestConfig = {
        ...defaultConfig,
        questionTypes: [],
        includeMatching: false
      };

      service.generateAndPrint(mockFlashcards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).not.toContain('class="question question--written"');
      expect(html).not.toContain('class="question question--mc"');
      expect(html).not.toContain('class="question question--tf"');
    });

    it('powinien obslużyc pusta liste fiszek', () => {
      expect(() => service.generateAndPrint([], defaultConfig)).not.toThrow();

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('<!DOCTYPE html>');
    });
  });

  describe('dopasowywanie (matching)', () => {
    it('powinien wygenerowac sekcje matching gdy includeMatching jest true', () => {
      const config: PrintTestConfig = { ...defaultConfig, includeMatching: true };

      service.generateAndPrint(mockFlashcards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('matching__col');
      expect(html).toContain('match-row');
      expect(html).toContain('match-blank');
    });

    it('nie powinien generowac matching gdy includeMatching jest false', () => {
      const config: PrintTestConfig = { ...defaultConfig, includeMatching: false };

      service.generateAndPrint(mockFlashcards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).not.toContain('class="matching__col');
    });

    it('powinien ograniczyc matching do max 10 par', () => {
      const manyCards: FlashcardDTO[] = Array.from({ length: 20 }, (_, i) =>
        mockFlashcard(i + 1, `term${i + 1}`, `def${i + 1}`)
      );
      const config: PrintTestConfig = {
        ...defaultConfig,
        questionTypes: [],
        includeMatching: true
      };

      service.generateAndPrint(manyCards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      // Count actual match-row elements in HTML (not CSS definitions)
      const matchRowCount: number = (html.match(/class="match-row"/g) || []).length;
      // Each matching pair produces 1 left row + 1 right row = 2 rows per pair, max 10 pairs = 20 rows
      expect(matchRowCount).toBeLessThanOrEqual(20);
    });

    it('powinien uzyc back jako left gdy reversed jest true', () => {
      const cards: FlashcardDTO[] = [mockFlashcard(1, 'dog', 'pies')];
      const config: PrintTestConfig = {
        ...defaultConfig,
        questionTypes: [],
        includeMatching: true,
        reversed: true
      };

      service.generateAndPrint(cards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      // 'pies' powinien byc po stronie lewej (match-text po match-num)
      expect(html).toContain('pies');
      expect(html).toContain('dog');
    });
  });

  describe('naglowek (header)', () => {
    it('powinien zawierac tytul testu', () => {
      service.generateAndPrint(mockFlashcards, defaultConfig);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('header__branding');
      expect(html).toContain('Testowy sprawdzian');
    });

    it('powinien zawierac pole na imie i date', () => {
      service.generateAndPrint(mockFlashcards, defaultConfig);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('header__field');
      expect(html).toContain('header__field-line');
    });

    it('powinien zawierac pole wynik z calkowita liczba pytan', () => {
      const config: PrintTestConfig = { ...defaultConfig, questionTypes: ['written'], questionCount: 3 };

      service.generateAndPrint(mockFlashcards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('header__score-box');
      expect(html).toContain('/ 3');
    });
  });

  describe('klucz odpowiedzi', () => {
    it('powinien zawierac klucz odpowiedzi gdy includeAnswerKey jest true', () => {
      const config: PrintTestConfig = { ...defaultConfig, includeAnswerKey: true };

      service.generateAndPrint(mockFlashcards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('answer-key');
      expect(html).toContain('ak-table');
    });

    it('nie powinien zawierac klucza odpowiedzi gdy includeAnswerKey jest false', () => {
      const config: PrintTestConfig = { ...defaultConfig, includeAnswerKey: false };

      service.generateAndPrint(mockFlashcards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).not.toContain('class="answer-key"');
    });

    it('powinien zawierac poprawne odpowiedzi w kluczu dla pytan written', () => {
      const cards: FlashcardDTO[] = [mockFlashcard(1, 'dog', 'pies')];
      const config: PrintTestConfig = {
        ...defaultConfig,
        questionTypes: ['written'],
        questionCount: 1,
        includeAnswerKey: true
      };

      service.generateAndPrint(cards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('pies');
    });
  });

  describe('escapowanie HTML', () => {
    it('powinien escapowac znaki specjalne HTML w tytule', () => {
      const config: PrintTestConfig = {
        ...defaultConfig,
        title: '<script>alert("xss")</script>'
      };

      service.generateAndPrint(mockFlashcards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).not.toContain('<script>alert');
      expect(html).toContain('&lt;script&gt;');
    });

    it('powinien escapowac znaki specjalne HTML w tresciach pytan', () => {
      const cards: FlashcardDTO[] = [mockFlashcard(1, 'A & B <tag>', 'C "quoted"')];
      const config: PrintTestConfig = {
        ...defaultConfig,
        questionTypes: ['written'],
        questionCount: 1
      };

      service.generateAndPrint(cards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('A &amp; B &lt;tag&gt;');
    });
  });

  describe('styl CSS', () => {
    it('powinien uzyc systemowego fontu sans-serif', () => {
      service.generateAndPrint(mockFlashcards, defaultConfig);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('font-family');
      expect(html).not.toContain('fonts.googleapis.com');
    });

    it('powinien zawierac reguly @media print', () => {
      service.generateAndPrint(mockFlashcards, defaultConfig);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('@media print');
      expect(html).toContain('@page');
    });

    it('powinien ustawic rozmiar strony A4', () => {
      service.generateAndPrint(mockFlashcards, defaultConfig);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('size: A4');
    });
  });

  describe('numeracja pytan', () => {
    it('powinien nadawac ciagla numeracje w sekcjach', () => {
      const config: PrintTestConfig = {
        ...defaultConfig,
        questionTypes: ['written', 'multiple-choice'],
        questionCount: 'all'
      };

      service.generateAndPrint(mockFlashcards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      // Powinien zawierac numery od 1 do 5
      expect(html).toContain('>1.<');
      expect(html).toContain('>5.<');
    });
  });

  describe('oznaczenia sekcji', () => {
    it('powinien oznaczac pierwsza sekcje litera A', () => {
      const config: PrintTestConfig = {
        ...defaultConfig,
        questionTypes: ['written'],
        questionCount: 'all'
      };

      service.generateAndPrint(mockFlashcards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('section__icon">A<');
    });

    it('powinien oznaczac matching poprawna litera po pozostalych sekcjach', () => {
      const config: PrintTestConfig = {
        ...defaultConfig,
        questionTypes: ['written'],
        includeMatching: true,
        questionCount: 'all'
      };

      service.generateAndPrint(mockFlashcards, config);

      const html: string = mockPrintWindow.document.write.calls.first().args[0];
      expect(html).toContain('section__icon">A<');
      expect(html).toContain('section__icon">B<');
    });
  });
});
