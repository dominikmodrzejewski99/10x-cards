import { TestBed } from '@angular/core/testing';
import { FlashcardExportService } from './flashcard-export.service';
import { FlashcardDTO } from '../../types';

describe('FlashcardExportService', () => {
  let service: FlashcardExportService;
  let createObjectURLSpy: jasmine.Spy;
  let revokeObjectURLSpy: jasmine.Spy;
  let clickSpy: jasmine.Spy;
  let createdLink: HTMLAnchorElement;

  const mockFlashcards: FlashcardDTO[] = [
    {
      id: 1,
      front: 'Hello',
      back: 'Cześć',
      front_image_url: null,
      back_audio_url: null,
      front_language: 'en',
      back_language: 'pl',
      source: 'manual',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      user_id: 'user-1',
      generation_id: null,
      set_id: 1
    },
    {
      id: 2,
      front: 'World',
      back: 'Świat',
      front_image_url: null,
      back_audio_url: null,
      front_language: 'en',
      back_language: 'pl',
      source: 'ai-full',
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
      user_id: 'user-1',
      generation_id: 10,
      set_id: 1
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FlashcardExportService);

    createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');
    revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL');

    clickSpy = jasmine.createSpy('click');
    spyOn(document, 'createElement').and.callFake((tag: string): HTMLAnchorElement => {
      createdLink = {
        href: '',
        download: '',
        click: clickSpy
      } as unknown as HTMLAnchorElement;
      return createdLink;
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('exportToCsv', () => {
    it('should generate CSV with BOM and correct headers', () => {
      service.exportToCsv(mockFlashcards, 'test.csv');

      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      const blob: Blob = createObjectURLSpy.calls.first().args[0] as Blob;
      expect(blob.type).toBe('text/csv;charset=utf-8');

      const reader: FileReader = new FileReader();
      reader.onload = (): void => {
        const content: string = reader.result as string;
        expect(content.startsWith('\uFEFF')).toBeTrue();
        expect(content).toContain('front,back,front_language,back_language,source');
        expect(content).toContain('Hello,Cześć,en,pl,manual');
        expect(content).toContain('World,Świat,en,pl,ai-full');
      };
      reader.readAsText(blob);
    });

    it('should trigger file download with correct filename', () => {
      service.exportToCsv(mockFlashcards, 'my-flashcards.csv');

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(createdLink.download).toBe('my-flashcards.csv');
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should escape fields with commas', () => {
      const flashcardsWithComma: FlashcardDTO[] = [{
        ...mockFlashcards[0],
        front: 'Hello, world'
      }];

      service.exportToCsv(flashcardsWithComma, 'test.csv');

      const blob: Blob = createObjectURLSpy.calls.first().args[0] as Blob;
      const reader: FileReader = new FileReader();
      reader.onload = (): void => {
        const content: string = reader.result as string;
        expect(content).toContain('"Hello, world"');
      };
      reader.readAsText(blob);
    });

    it('should escape fields with quotes', () => {
      const flashcardsWithQuotes: FlashcardDTO[] = [{
        ...mockFlashcards[0],
        front: 'Say "hello"'
      }];

      service.exportToCsv(flashcardsWithQuotes, 'test.csv');

      const blob: Blob = createObjectURLSpy.calls.first().args[0] as Blob;
      const reader: FileReader = new FileReader();
      reader.onload = (): void => {
        const content: string = reader.result as string;
        expect(content).toContain('"Say ""hello"""');
      };
      reader.readAsText(blob);
    });

    it('should escape fields with newlines', () => {
      const flashcardsWithNewline: FlashcardDTO[] = [{
        ...mockFlashcards[0],
        back: 'Line 1\nLine 2'
      }];

      service.exportToCsv(flashcardsWithNewline, 'test.csv');

      const blob: Blob = createObjectURLSpy.calls.first().args[0] as Blob;
      const reader: FileReader = new FileReader();
      reader.onload = (): void => {
        const content: string = reader.result as string;
        expect(content).toContain('"Line 1\nLine 2"');
      };
      reader.readAsText(blob);
    });

    it('should handle null language fields', () => {
      const flashcardsWithNullLang: FlashcardDTO[] = [{
        ...mockFlashcards[0],
        front_language: null,
        back_language: null
      }];

      service.exportToCsv(flashcardsWithNullLang, 'test.csv');

      const blob: Blob = createObjectURLSpy.calls.first().args[0] as Blob;
      const reader: FileReader = new FileReader();
      reader.onload = (): void => {
        const content: string = reader.result as string;
        expect(content).toContain('Hello,Cześć,,,manual');
      };
      reader.readAsText(blob);
    });

    it('should handle empty flashcards array', () => {
      service.exportToCsv([], 'empty.csv');

      expect(clickSpy).toHaveBeenCalledTimes(1);
      const blob: Blob = createObjectURLSpy.calls.first().args[0] as Blob;
      const reader: FileReader = new FileReader();
      reader.onload = (): void => {
        const content: string = reader.result as string;
        expect(content).toBe('\uFEFFfront,back,front_language,back_language,source');
      };
      reader.readAsText(blob);
    });
  });

  describe('exportToJson', () => {
    it('should generate JSON with selected fields only', () => {
      service.exportToJson(mockFlashcards, 'test.json');

      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      const blob: Blob = createObjectURLSpy.calls.first().args[0] as Blob;
      expect(blob.type).toBe('application/json;charset=utf-8');

      const reader: FileReader = new FileReader();
      reader.onload = (): void => {
        const content: string = reader.result as string;
        const parsed: Record<string, unknown>[] = JSON.parse(content) as Record<string, unknown>[];
        expect(parsed.length).toBe(2);
        expect(parsed[0]).toEqual({
          front: 'Hello',
          back: 'Cześć',
          front_language: 'en',
          back_language: 'pl',
          source: 'manual'
        });
        // Ensure internal fields are not exported
        expect(parsed[0]['id' as keyof typeof parsed[0]]).toBeUndefined();
        expect(parsed[0]['user_id' as keyof typeof parsed[0]]).toBeUndefined();
        expect(parsed[0]['set_id' as keyof typeof parsed[0]]).toBeUndefined();
      };
      reader.readAsText(blob);
    });

    it('should trigger file download with correct filename', () => {
      service.exportToJson(mockFlashcards, 'my-flashcards.json');

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(createdLink.download).toBe('my-flashcards.json');
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should handle empty flashcards array', () => {
      service.exportToJson([], 'empty.json');

      const blob: Blob = createObjectURLSpy.calls.first().args[0] as Blob;
      const reader: FileReader = new FileReader();
      reader.onload = (): void => {
        const content: string = reader.result as string;
        const parsed: Record<string, unknown>[] = JSON.parse(content) as Record<string, unknown>[];
        expect(parsed).toEqual([]);
      };
      reader.readAsText(blob);
    });
  });
});
