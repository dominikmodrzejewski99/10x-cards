import { TestBed } from '@angular/core/testing';
import { ImageUploadService } from './image-upload.service';
import { SupabaseClientFactory } from './supabase-client.factory';

interface MockStorageBucket {
  upload: jasmine.Spy;
  remove: jasmine.Spy;
}

interface MockSupabaseClient {
  auth: {
    getSession: jasmine.Spy;
  };
  storage: {
    from: jasmine.Spy;
  };
}

const MOCK_USER_ID = 'user-img-321';

describe('ImageUploadService', () => {
  let service: ImageUploadService;
  let mockSupabase: MockSupabaseClient;
  let mockBucket: MockStorageBucket;

  beforeEach(() => {
    mockBucket = {
      upload: jasmine.createSpy('upload').and.returnValue(
        Promise.resolve({ data: { path: `${MOCK_USER_ID}/test.jpg` }, error: null })
      ),
      remove: jasmine.createSpy('remove').and.returnValue(
        Promise.resolve({ data: [{}], error: null })
      )
    };

    mockSupabase = {
      auth: {
        getSession: jasmine.createSpy('getSession').and.returnValue(
          Promise.resolve({
            data: { session: { user: { id: MOCK_USER_ID } } },
            error: null
          })
        )
      },
      storage: {
        from: jasmine.createSpy('from').and.returnValue(mockBucket)
      }
    };

    TestBed.configureTestingModule({
      providers: [
        ImageUploadService,
        { provide: SupabaseClientFactory, useValue: { getClient: (): MockSupabaseClient => mockSupabase } }
      ]
    });

    service = TestBed.inject(ImageUploadService);
  });

  describe('validateFile', () => {
    it('should return null for valid JPEG file', () => {
      const file: File = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      expect(service.validateFile(file)).toBeNull();
    });

    it('should return null for valid PNG file', () => {
      const file: File = new File(['data'], 'photo.png', { type: 'image/png' });
      expect(service.validateFile(file)).toBeNull();
    });

    it('should return null for valid WebP file', () => {
      const file: File = new File(['data'], 'photo.webp', { type: 'image/webp' });
      expect(service.validateFile(file)).toBeNull();
    });

    it('should return null for valid GIF file', () => {
      const file: File = new File(['data'], 'animation.gif', { type: 'image/gif' });
      expect(service.validateFile(file)).toBeNull();
    });

    it('should return error for invalid MIME type', () => {
      const file: File = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
      expect(service.validateFile(file)).toBe('Dozwolone formaty: JPEG, PNG, WebP, GIF');
    });

    it('should return error for text file', () => {
      const file: File = new File(['data'], 'notes.txt', { type: 'text/plain' });
      expect(service.validateFile(file)).toBe('Dozwolone formaty: JPEG, PNG, WebP, GIF');
    });

    it('should return error for file exceeding 2MB', () => {
      const largeData: ArrayBuffer = new ArrayBuffer(2 * 1024 * 1024 + 1);
      const file: File = new File([largeData], 'large.jpg', { type: 'image/jpeg' });
      expect(service.validateFile(file)).toBe('Maksymalny rozmiar pliku to 2MB');
    });

    it('should return null for file exactly at 2MB limit', () => {
      const exactData: ArrayBuffer = new ArrayBuffer(2 * 1024 * 1024);
      const file: File = new File([exactData], 'exact.jpg', { type: 'image/jpeg' });
      expect(service.validateFile(file)).toBeNull();
    });
  });

  describe('uploadImage', () => {
    it('should reject invalid file without calling Supabase', (done: DoneFn) => {
      const file: File = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
      service.uploadImage(file).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Dozwolone formaty: JPEG, PNG, WebP, GIF');
          expect(mockSupabase.auth.getSession).not.toHaveBeenCalled();
          done();
        }
      });
    });

    it('should upload valid file and return public URL', (done: DoneFn) => {
      const file: File = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      service.uploadImage(file).subscribe({
        next: (url: string) => {
          expect(url).toContain('/storage/v1/object/public/flashcard-images/');
          expect(url).toContain(`${MOCK_USER_ID}/`);
          expect(mockSupabase.storage.from).toHaveBeenCalledWith('flashcard-images');
          done();
        }
      });
    });

    it('should throw error when user not authenticated', (done: DoneFn) => {
      mockSupabase.auth.getSession.and.returnValue(
        Promise.resolve({ data: { session: null }, error: null })
      );
      const file: File = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      service.uploadImage(file).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Użytkownik nie jest zalogowany');
          done();
        }
      });
    });

    it('should throw error when auth session has error', (done: DoneFn) => {
      mockSupabase.auth.getSession.and.returnValue(
        Promise.resolve({ data: { session: null }, error: { message: 'Token expired' } })
      );
      const file: File = new File(['data'], 'photo.png', { type: 'image/png' });
      service.uploadImage(file).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Użytkownik nie jest zalogowany');
          done();
        }
      });
    });

    it('should throw error when storage upload fails', (done: DoneFn) => {
      mockBucket.upload.and.returnValue(
        Promise.resolve({ data: null, error: { message: 'Bucket full' } })
      );
      const file: File = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      service.uploadImage(file).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Bucket full');
          done();
        }
      });
    });
  });

  describe('deleteImage', () => {
    it('should delete file by valid URL', (done: DoneFn) => {
      const url: string = 'https://example.supabase.co/storage/v1/object/public/flashcard-images/user-123/abc.jpg';
      service.deleteImage(url).subscribe({
        next: () => {
          expect(mockSupabase.storage.from).toHaveBeenCalledWith('flashcard-images');
          expect(mockBucket.remove).toHaveBeenCalledWith(['user-123/abc.jpg']);
          done();
        }
      });
    });

    it('should throw error for invalid URL (missing bucket path)', (done: DoneFn) => {
      service.deleteImage('https://invalid.com/random/path.jpg').subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Nieprawidłowy URL obrazka');
          done();
        }
      });
    });

    it('should throw error when storage remove fails', (done: DoneFn) => {
      mockBucket.remove.and.returnValue(
        Promise.resolve({ data: null, error: { message: 'File not found' } })
      );
      const url: string = 'https://example.supabase.co/storage/v1/object/public/flashcard-images/user-123/abc.jpg';
      service.deleteImage(url).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('File not found');
          done();
        }
      });
    });
  });
});
