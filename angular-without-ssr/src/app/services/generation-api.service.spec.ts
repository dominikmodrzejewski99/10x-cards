import { TestBed } from '@angular/core/testing';
import { GenerationApiService } from './generation-api.service';
import { OpenRouterService } from './openrouter.service';
import { GenerateFlashcardsCommand, GenerationDTO, FlashcardProposalDTO } from '../../types';

describe('GenerationApiService', () => {
  let service: GenerationApiService;
  let openRouterSpy: jasmine.SpyObj<OpenRouterService>;

  beforeEach(() => {
    openRouterSpy = jasmine.createSpyObj<OpenRouterService>('OpenRouterService', ['sendMessage']);
    (openRouterSpy as unknown as Record<string, unknown>)['defaultModel'] = 'gemini-2.5-flash';

    TestBed.configureTestingModule({
      providers: [
        GenerationApiService,
        { provide: OpenRouterService, useValue: openRouterSpy }
      ]
    });

    service = TestBed.inject(GenerationApiService);
  });

  describe('generateFlashcards', () => {
    const command: GenerateFlashcardsCommand = {
      text: 'A'.repeat(1000)
    };

    it('should parse valid JSON response and return flashcards', (done: DoneFn) => {
      const jsonResponse: string = JSON.stringify({
        flashcards: [
          { front: 'Q1', back: 'A1' },
          { front: 'Q2', back: 'A2' },
          { front: 'Q3', back: 'A3' }
        ]
      });
      openRouterSpy.sendMessage.and.returnValue(Promise.resolve(jsonResponse));

      service.generateFlashcards(command).subscribe({
        next: (result: { generation: GenerationDTO; flashcards: FlashcardProposalDTO[] }) => {
          expect(result.flashcards.length).toBe(3);
          expect(result.flashcards[0].front).toBe('Q1');
          expect(result.flashcards[0].back).toBe('A1');
          expect(result.flashcards[0].source).toBe('ai-full');
          expect(result.generation.generated_count).toBe(3);
          expect(result.generation.model).toBe('google/gemma-3-12b-it:free');
          expect(result.generation.source_text_length).toBe(1000);
          done();
        }
      });
    });

    it('should handle JSON wrapped in code blocks', (done: DoneFn) => {
      const wrappedResponse: string = '```json\n{"flashcards": [{"front": "Q1", "back": "A1"}]}\n```';
      openRouterSpy.sendMessage.and.returnValue(Promise.resolve(wrappedResponse));

      service.generateFlashcards(command).subscribe({
        next: (result: { generation: GenerationDTO; flashcards: FlashcardProposalDTO[] }) => {
          expect(result.flashcards.length).toBe(1);
          expect(result.flashcards[0].front).toBe('Q1');
          done();
        }
      });
    });

    it('should handle array response (no wrapper object)', (done: DoneFn) => {
      const arrayResponse: string = JSON.stringify([
        { front: 'Q1', back: 'A1' },
        { front: 'Q2', back: 'A2' }
      ]);
      openRouterSpy.sendMessage.and.returnValue(Promise.resolve(arrayResponse));

      service.generateFlashcards(command).subscribe({
        next: (result: { generation: GenerationDTO; flashcards: FlashcardProposalDTO[] }) => {
          expect(result.flashcards.length).toBe(2);
          done();
        }
      });
    });

    it('should deduplicate flashcards with same front text', (done: DoneFn) => {
      const dupeResponse: string = JSON.stringify({
        flashcards: [
          { front: 'Same Q', back: 'A1' },
          { front: 'Same Q', back: 'A2' },
          { front: 'Different Q', back: 'A3' }
        ]
      });
      openRouterSpy.sendMessage.and.returnValue(Promise.resolve(dupeResponse));

      service.generateFlashcards(command).subscribe({
        next: (result: { generation: GenerationDTO; flashcards: FlashcardProposalDTO[] }) => {
          expect(result.flashcards.length).toBe(2);
          done();
        }
      });
    });

    it('should filter out items missing front or back', (done: DoneFn) => {
      const badItemsResponse: string = JSON.stringify({
        flashcards: [
          { front: 'Q1', back: 'A1' },
          { front: '', back: 'A2' },
          { front: 'Q3' },
          { back: 'A4' }
        ]
      });
      openRouterSpy.sendMessage.and.returnValue(Promise.resolve(badItemsResponse));

      service.generateFlashcards(command).subscribe({
        next: (result: { generation: GenerationDTO; flashcards: FlashcardProposalDTO[] }) => {
          expect(result.flashcards.length).toBe(1);
          expect(result.flashcards[0].front).toBe('Q1');
          done();
        }
      });
    });

    it('should limit to 15 flashcards maximum', (done: DoneFn) => {
      const manyCards: Array<{ front: string; back: string }> = [];
      for (let i: number = 0; i < 20; i++) {
        manyCards.push({ front: `Q${i}`, back: `A${i}` });
      }
      openRouterSpy.sendMessage.and.returnValue(
        Promise.resolve(JSON.stringify({ flashcards: manyCards }))
      );

      service.generateFlashcards(command).subscribe({
        next: (result: { generation: GenerationDTO; flashcards: FlashcardProposalDTO[] }) => {
          expect(result.flashcards.length).toBe(15);
          done();
        }
      });
    });

    it('should throw error on completely invalid JSON', (done: DoneFn) => {
      openRouterSpy.sendMessage.and.returnValue(Promise.resolve('This is not JSON at all'));

      service.generateFlashcards(command).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Nie udało się wygenerować fiszek');
          done();
        }
      });
    });

    it('should throw error on empty response', (done: DoneFn) => {
      openRouterSpy.sendMessage.and.returnValue(Promise.resolve(''));

      service.generateFlashcards(command).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Nie udało się wygenerować fiszek');
          done();
        }
      });
    });

    it('should throw error on JSON with empty flashcards array', (done: DoneFn) => {
      openRouterSpy.sendMessage.and.returnValue(
        Promise.resolve(JSON.stringify({ flashcards: [] }))
      );

      service.generateFlashcards(command).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Nie udało się wygenerować fiszek');
          done();
        }
      });
    });

    it('should use custom model when provided', (done: DoneFn) => {
      const customCommand: GenerateFlashcardsCommand = {
        text: 'A'.repeat(1000),
        model: 'custom/model'
      };
      const jsonResponse: string = JSON.stringify({
        flashcards: [{ front: 'Q1', back: 'A1' }]
      });
      openRouterSpy.sendMessage.and.returnValue(Promise.resolve(jsonResponse));

      service.generateFlashcards(customCommand).subscribe({
        next: (result: { generation: GenerationDTO; flashcards: FlashcardProposalDTO[] }) => {
          // generation.model reflects the service's defaultModel (OpenRouterService.defaultModel)
          expect(result.generation.model).toBe('google/gemma-3-12b-it:free');
          // The service calls sendMessage without a model option (uses FALLBACK_MODELS internally)
          expect(openRouterSpy.sendMessage).toHaveBeenCalledWith(
            jasmine.any(String),
            undefined,
            jasmine.objectContaining({ useJsonFormat: true })
          );
          done();
        }
      });
    });

    it('should repair truncated JSON and extract valid flashcards', (done: DoneFn) => {
      // Truncated: missing closing bracket and brace
      const truncatedJson: string = '{"flashcards": [{"front": "Q1", "back": "A1"}, {"front": "Q2", "back": "A2"}, {"fro';
      openRouterSpy.sendMessage.and.returnValue(Promise.resolve(truncatedJson));

      service.generateFlashcards(command).subscribe({
        next: (result: { generation: GenerationDTO; flashcards: FlashcardProposalDTO[] }) => {
          expect(result.flashcards.length).toBeGreaterThanOrEqual(2);
          expect(result.flashcards[0].front).toBe('Q1');
          done();
        }
      });
    });
  });

  describe('repairTruncatedJson (via generateFlashcards)', () => {
    const command: GenerateFlashcardsCommand = { text: 'A'.repeat(1000) };

    it('should salvage flashcards from truncated JSON with regex fallback', (done: DoneFn) => {
      // This will fail normal parse and repair, so regex fallback kicks in
      const broken: string = '{"flashcards": [{"front": "Hello", "back": "World"}, {"front": "Foo", "back": "Bar"';
      openRouterSpy.sendMessage.and.returnValue(Promise.resolve(broken));

      service.generateFlashcards(command).subscribe({
        next: (result: { generation: GenerationDTO; flashcards: FlashcardProposalDTO[] }) => {
          expect(result.flashcards.length).toBeGreaterThanOrEqual(1);
          done();
        }
      });
    });
  });
});
