import { TestBed } from '@angular/core/testing';
import { AudioUploadService } from './audio-upload.service';
import { SupabaseClientFactory } from './supabase-client.factory';

describe('AudioUploadService', () => {
  let service: AudioUploadService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getSession: jasmine.createSpy('getSession').and.returnValue(
          Promise.resolve({ data: { session: { user: { id: 'user-123' } } }, error: null })
        )
      },
      storage: {
        from: jasmine.createSpy('from').and.returnValue({
          upload: jasmine.createSpy('upload').and.returnValue(
            Promise.resolve({ data: { path: 'user-123/file.mp3' }, error: null })
          ),
          remove: jasmine.createSpy('remove').and.returnValue(
            Promise.resolve({ data: [{}], error: null })
          )
        })
      }
    };

    TestBed.configureTestingModule({
      providers: [
        AudioUploadService,
        { provide: SupabaseClientFactory, useValue: { getClient: () => mockSupabase } }
      ]
    });

    service = TestBed.inject(AudioUploadService);
  });

  describe('validateFile', () => {
    it('should return null for valid MP3 file', () => {
      const file: File = new File(['data'], 'test.mp3', { type: 'audio/mpeg' });
      expect(service.validateFile(file)).toBeNull();
    });

    it('should return null for valid WAV file', () => {
      const file: File = new File(['data'], 'test.wav', { type: 'audio/wav' });
      expect(service.validateFile(file)).toBeNull();
    });

    it('should return null for valid OGG file', () => {
      const file: File = new File(['data'], 'test.ogg', { type: 'audio/ogg' });
      expect(service.validateFile(file)).toBeNull();
    });

    it('should return null for valid WebM file', () => {
      const file: File = new File(['data'], 'test.webm', { type: 'audio/webm' });
      expect(service.validateFile(file)).toBeNull();
    });

    it('should return error for invalid MIME type', () => {
      const file: File = new File(['data'], 'test.txt', { type: 'text/plain' });
      expect(service.validateFile(file)).toBe('Dozwolone formaty: MP3, WAV, OGG, WebM');
    });

    it('should return error for file exceeding 2MB', () => {
      const largeData: ArrayBuffer = new ArrayBuffer(2 * 1024 * 1024 + 1);
      const file: File = new File([largeData], 'test.mp3', { type: 'audio/mpeg' });
      expect(service.validateFile(file)).toBe('Maksymalny rozmiar pliku to 2MB');
    });
  });

  describe('uploadAudio', () => {
    it('should reject invalid file without calling Supabase', (done: DoneFn) => {
      const file: File = new File(['data'], 'test.txt', { type: 'text/plain' });
      service.uploadAudio(file).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Dozwolone formaty: MP3, WAV, OGG, WebM');
          expect(mockSupabase.auth.getSession).not.toHaveBeenCalled();
          done();
        }
      });
    });

    it('should upload valid file and return public URL', (done: DoneFn) => {
      const file: File = new File(['data'], 'test.mp3', { type: 'audio/mpeg' });
      service.uploadAudio(file).subscribe({
        next: (url: string) => {
          expect(url).toContain('/storage/v1/object/public/flashcard-audio/');
          expect(url).toContain('user-123/');
          done();
        }
      });
    });

    it('should throw error when user not authenticated', (done: DoneFn) => {
      mockSupabase.auth.getSession.and.returnValue(
        Promise.resolve({ data: { session: null }, error: null })
      );
      const file: File = new File(['data'], 'test.mp3', { type: 'audio/mpeg' });
      service.uploadAudio(file).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Użytkownik nie jest zalogowany');
          done();
        }
      });
    });
  });

  describe('deleteAudio', () => {
    it('should delete file by URL', (done: DoneFn) => {
      const url: string = 'https://example.supabase.co/storage/v1/object/public/flashcard-audio/user-123/abc.mp3';
      service.deleteAudio(url).subscribe({
        next: () => {
          expect(mockSupabase.storage.from).toHaveBeenCalledWith('flashcard-audio');
          done();
        }
      });
    });

    it('should throw error for invalid URL', (done: DoneFn) => {
      service.deleteAudio('https://invalid.com/file.mp3').subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Nieprawidłowy URL pliku audio');
          done();
        }
      });
    });
  });
});
