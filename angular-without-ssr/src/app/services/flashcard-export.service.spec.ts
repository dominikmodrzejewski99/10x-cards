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
      back: 'Cze\u015b\u0107',
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
      back: '\u015awiat',
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
    spyOn(document, 'createElement').and.callFake((_tag: string): HTMLAnchorElement => {
      createdLink = {
        href: '',
        download: '',
        click: clickSpy
      } as unknown as HTMLAnchorElement;
      return createdLink;
    });
  });

  /** Read blob as raw bytes and decode with BOM preserved */
  async function readBlobContent(blob: Blob): Promise<string> {
    const buffer: ArrayBuffer = await blob.arrayBuffer();
    const bytes: Uint8Array = new Uint8Array(buffer);
    // Decode with a TextDecoder that does NOT strip BOM
    const decoder: TextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
    return decoder.decode(bytes);
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('exportToCsv', () => {
    it('should generate CSV with BOM and correct headers', async () => {
      service.exportToCsv(mockFlashcards, 'test.csv');

      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      const blob: Blob = createObjectURLSpy.calls.first().args[0] as Blob;
      expect(blob.type).toBe('text/csv;charset=utf-8');

      const content: string = await readBlobContent(blob);
      expect(content.charCodeAt(0)).toBe(0xFEFF);
      expect(content).toContain('front,back,front_language,back_language,source');
      expect(content).toContain('Hello,Cze\u015b\u0107,en,pl,manual');
      expect(content).toContain('World,\u015awiat,en,pl,ai-full');
    });

    it('should trigger file download with correct filename', () => {
      service.exportToCsv(mockFlashcards, 'my-flashcards.csv');

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(createdLink.download).toBe('my-flashcards.csv');
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should escape fields with commas', async () => {
      const flashcardsWithComma: FlashcardDTO[] = [{
        ...mockFlashcards[0],
        front: 'Hello, world'
      }];

      service.exportToCsv(flashcardsWithComma, 'test.csv');

      const blob: Blob = createObjectURLSpy.calls.first().args[0] as Blob;
      const content: string = await readBlobContent(blob);
      expect(content).toContain('"Hello, world"');
    });

    it('should escape fields with quotes', async () => {
      const flashcardsWithQuotes: FlashcardDTO[] = [{
        ...mockFlashcards[0],
        front: 'Say "hello"'
      }];

      service.exportToCsv(flashcardsWithQuotes, 'test.csv');

      const blob: Blob = createObjectURLSpy.calls.first().args[0] as Blob;
      const content: string = await readBlobContent(blob);
      expect(content).toContain('"Say ""hello"""');
    });

    it('should escape fields with newlines', async () => {
      const flashcardsWithNewline: FlashcardDTO[] = [{
        ...mockFlashcards[0],
        back: 'Line 1\nLine 2'
      }];

      service.exportToCsv(flashcardsWithNewline, 'test.csv');

      const blob: Blob = createObjectURLSpy.calls.first().args[0] as Blob;
      const content: string = await readBlobContent(blob);
      expect(content).toContain('"Line 1\nLine 2"');
    });

    it('should handle null language fields', async () => {
      const flashcardsWithNullLang: FlashcardDTO[] = [{
        ...mockFlashcards[0],
        front_language: null,
        back_language: null
      }];

      service.exportToCsv(flashcardsWithNullLang, 'test.csv');

      const blob: Blob = createObjectURLSpy.calls.first().args[0] as Blob;
      const content: string = await readBlobContent(blob);
      expect(content).toContain('Hello,Cze\u015b\u0107,,,manual');
    });

    it('should handle empty flashcards array', async () => {
      service.exportToCsv([], 'empty.csv');

      expect(clickSpy).toHaveBeenCalledTimes(1);
      const blob: Blob = createObjectURLSpy.calls.first().args[0] as Blob;
      const content: string = await readBlobContent(blob);
      expect(content).toBe('\uFEFFfront,back,front_language,back_language,source');
    });
  });

  describe('exportToJson', () => {
    it('should generate JSON with selected fields only', async () => {
      service.exportToJson(mockFlashcards, 'test.json');

      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      const blob: Blob = createObjectURLSpy.calls.first().args[0] as Blob;
      expect(blob.type).toBe('application/json;charset=utf-8');

      const content: string = await blob.text();
      const parsed: Record<string, unknown>[] = JSON.parse(content) as Record<string, unknown>[];
      expect(parsed.length).toBe(2);
      expect(parsed[0]).toEqual({
        front: 'Hello',
        back: 'Cze\u015b\u0107',
        front_language: 'en',
        back_language: 'pl',
        source: 'manual'
      });
      // Ensure internal fields are not exported
      expect(parsed[0]['id' as keyof typeof parsed[0]]).toBeUndefined();
      expect(parsed[0]['user_id' as keyof typeof parsed[0]]).toBeUndefined();
      expect(parsed[0]['set_id' as keyof typeof parsed[0]]).toBeUndefined();
    });

    it('should trigger file download with correct filename', () => {
      service.exportToJson(mockFlashcards, 'my-flashcards.json');

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(createdLink.download).toBe('my-flashcards.json');
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should handle empty flashcards array', async () => {
      service.exportToJson([], 'empty.json');

      const blob: Blob = createObjectURLSpy.calls.first().args[0] as Blob;
      const content: string = await blob.text();
      const parsed: Record<string, unknown>[] = JSON.parse(content) as Record<string, unknown>[];
      expect(parsed).toEqual([]);
    });
  });
});
