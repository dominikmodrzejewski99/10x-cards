import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { FlashcardFormComponent } from './flashcard-form.component';
import { ImageUploadService } from '../../../services/image-upload.service';
import { OpenRouterService } from '../../../services/openrouter.service';
import { AudioUploadService } from '../../../services/audio-upload.service';

describe('FlashcardFormComponent', () => {
  let component: FlashcardFormComponent;
  let fixture: ComponentFixture<FlashcardFormComponent>;

  let imageUploadMock: jasmine.SpyObj<ImageUploadService>;
  let openRouterMock: jasmine.SpyObj<OpenRouterService>;
  let audioUploadMock: jasmine.SpyObj<AudioUploadService>;

  beforeEach(async () => {
    imageUploadMock = jasmine.createSpyObj<ImageUploadService>(
      'ImageUploadService',
      ['uploadImage', 'deleteImage', 'validateFile']
    );
    openRouterMock = jasmine.createSpyObj<OpenRouterService>(
      'OpenRouterService',
      ['translateText']
    );
    audioUploadMock = jasmine.createSpyObj<AudioUploadService>(
      'AudioUploadService',
      ['uploadAudio', 'deleteAudio', 'validateFile']
    );

    imageUploadMock.validateFile.and.returnValue(null);
    audioUploadMock.validateFile.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [FlashcardFormComponent, ReactiveFormsModule, TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' } })],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ImageUploadService, useValue: imageUploadMock },
        { provide: OpenRouterService, useValue: openRouterMock },
        { provide: AudioUploadService, useValue: audioUploadMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FlashcardFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form validation', () => {
    it('should be invalid when front is empty', () => {
      component.flashcardForm.patchValue({ front: '', back: 'Valid back' });
      component.flashcardForm.get('front')?.markAsTouched();

      expect(component.flashcardForm.get('front')?.valid).toBeFalse();
      expect(component.hasError('front', 'required')).toBeTrue();
    });

    it('should be invalid when back is empty', () => {
      component.flashcardForm.patchValue({ front: 'Valid front', back: '' });
      component.flashcardForm.get('back')?.markAsTouched();

      expect(component.flashcardForm.get('back')?.valid).toBeFalse();
      expect(component.hasError('back', 'required')).toBeTrue();
    });

    it('should be invalid when front exceeds max length', () => {
      const longText: string = 'A'.repeat(201);
      component.flashcardForm.patchValue({ front: longText, back: 'Valid' });
      component.flashcardForm.get('front')?.markAsTouched();

      expect(component.flashcardForm.get('front')?.valid).toBeFalse();
      expect(component.hasError('front', 'maxlength')).toBeTrue();
    });

    it('should be invalid when back exceeds max length', () => {
      const longText: string = 'A'.repeat(1001);
      component.flashcardForm.patchValue({ front: 'Valid', back: longText });
      component.flashcardForm.get('back')?.markAsTouched();

      expect(component.flashcardForm.get('back')?.valid).toBeFalse();
      expect(component.hasError('back', 'maxlength')).toBeTrue();
    });

    it('should be invalid when front is only whitespace', () => {
      component.flashcardForm.patchValue({ front: '   ', back: 'Valid' });
      component.flashcardForm.get('front')?.markAsTouched();

      expect(component.flashcardForm.get('front')?.valid).toBeFalse();
      expect(component.hasError('front', 'whitespace')).toBeTrue();
    });

    it('should be valid with proper data', () => {
      component.flashcardForm.patchValue({ front: 'Hello', back: 'Cześć' });

      expect(component.flashcardForm.valid).toBeTrue();
    });

    it('should not submit when form is invalid', () => {
      spyOn(component.save, 'emit');
      component.flashcardForm.patchValue({ front: '', back: '' });

      component.onSubmit();

      expect(component.save.emit).not.toHaveBeenCalled();
    });

    it('should emit save with form data when valid', () => {
      spyOn(component.save, 'emit');
      component.flashcardForm.patchValue({ front: 'Hello', back: 'Cześć' });

      component.onSubmit();

      expect(component.save.emit).toHaveBeenCalledWith(
        jasmine.objectContaining({ front: 'Hello', back: 'Cześć' })
      );
    });
  });

  describe('image upload', () => {
    it('should upload image and set preview', () => {
      imageUploadMock.uploadImage.and.returnValue(of('https://example.com/new-image.png'));

      const mockFile: File = new File(['data'], 'test.png', { type: 'image/png' });
      const mockEvent: Partial<Event> = {
        target: { files: [mockFile], value: '' } as unknown as EventTarget
      };

      component.onFileSelected(mockEvent as Event);

      expect(imageUploadMock.uploadImage).toHaveBeenCalledWith(mockFile);
      expect(component.imagePreviewSignal()).toBe('https://example.com/new-image.png');
      expect(component.uploadingSignal()).toBeFalse();
    });

    it('should show error on upload failure', () => {
      imageUploadMock.uploadImage.and.returnValue(
        throwError(() => new Error('Upload failed'))
      );

      const mockFile: File = new File(['data'], 'test.png', { type: 'image/png' });
      const mockEvent: Partial<Event> = {
        target: { files: [mockFile], value: '' } as unknown as EventTarget
      };

      component.onFileSelected(mockEvent as Event);

      expect(component.imageErrorSignal()).toBe('Upload failed');
      expect(component.uploadingSignal()).toBeFalse();
    });

    it('should show validation error for invalid file', () => {
      imageUploadMock.validateFile.and.returnValue('Invalid file type');

      const mockFile: File = new File(['data'], 'test.txt', { type: 'text/plain' });
      const mockEvent: Partial<Event> = {
        target: { files: [mockFile], value: '' } as unknown as EventTarget
      };

      component.onFileSelected(mockEvent as Event);

      expect(component.imageErrorSignal()).toBe('Invalid file type');
      expect(imageUploadMock.uploadImage).not.toHaveBeenCalled();
    });
  });

  describe('image remove', () => {
    it('should remove image and call deleteImage', () => {
      imageUploadMock.uploadImage.and.returnValue(of('https://example.com/img.png'));
      imageUploadMock.deleteImage.and.returnValue(of(undefined));

      // Simulate having an uploaded image
      const mockFile: File = new File(['data'], 'test.png', { type: 'image/png' });
      const mockEvent: Partial<Event> = {
        target: { files: [mockFile], value: '' } as unknown as EventTarget
      };
      component.onFileSelected(mockEvent as Event);

      component.removeImage();

      expect(imageUploadMock.deleteImage).toHaveBeenCalledWith('https://example.com/img.png');
      expect(component.imagePreviewSignal()).toBeNull();
    });

    it('should handle delete error gracefully', () => {
      imageUploadMock.uploadImage.and.returnValue(of('https://example.com/img.png'));
      imageUploadMock.deleteImage.and.returnValue(
        throwError(() => new Error('Delete failed'))
      );

      const mockFile: File = new File(['data'], 'test.png', { type: 'image/png' });
      const mockEvent: Partial<Event> = {
        target: { files: [mockFile], value: '' } as unknown as EventTarget
      };
      component.onFileSelected(mockEvent as Event);

      // Should not throw
      expect(() => component.removeImage()).not.toThrow();
      expect(component.imagePreviewSignal()).toBeNull();
    });
  });

  describe('audio upload', () => {
    it('should upload audio and set preview', () => {
      audioUploadMock.uploadAudio.and.returnValue(of('https://example.com/audio.webm'));

      const mockFile: File = new File(['data'], 'test.webm', { type: 'audio/webm' });
      const mockEvent: Partial<Event> = {
        target: { files: [mockFile], value: '' } as unknown as EventTarget
      };

      component.onAudioFileSelected(mockEvent as Event);

      expect(audioUploadMock.uploadAudio).toHaveBeenCalledWith(mockFile);
      expect(component.audioPreviewSignal()).toBe('https://example.com/audio.webm');
      expect(component.audioUploadingSignal()).toBeFalse();
    });

    it('should show error on audio upload failure', () => {
      audioUploadMock.uploadAudio.and.returnValue(
        throwError(() => new Error('Audio upload failed'))
      );

      const mockFile: File = new File(['data'], 'test.webm', { type: 'audio/webm' });
      const mockEvent: Partial<Event> = {
        target: { files: [mockFile], value: '' } as unknown as EventTarget
      };

      component.onAudioFileSelected(mockEvent as Event);

      expect(component.audioErrorSignal()).toBe('Audio upload failed');
      expect(component.audioUploadingSignal()).toBeFalse();
    });

    it('should show validation error for invalid audio file', () => {
      audioUploadMock.validateFile.and.returnValue('Invalid audio type');

      const mockFile: File = new File(['data'], 'test.txt', { type: 'text/plain' });
      const mockEvent: Partial<Event> = {
        target: { files: [mockFile], value: '' } as unknown as EventTarget
      };

      component.onAudioFileSelected(mockEvent as Event);

      expect(component.audioErrorSignal()).toBe('Invalid audio type');
      expect(audioUploadMock.uploadAudio).not.toHaveBeenCalled();
    });
  });

  describe('audio remove', () => {
    it('should remove audio and call deleteAudio', () => {
      audioUploadMock.uploadAudio.and.returnValue(of('https://example.com/audio.webm'));
      audioUploadMock.deleteAudio.and.returnValue(of(undefined));

      const mockFile: File = new File(['data'], 'test.webm', { type: 'audio/webm' });
      const mockEvent: Partial<Event> = {
        target: { files: [mockFile], value: '' } as unknown as EventTarget
      };
      component.onAudioFileSelected(mockEvent as Event);

      component.removeAudio();

      expect(audioUploadMock.deleteAudio).toHaveBeenCalledWith('https://example.com/audio.webm');
      expect(component.audioPreviewSignal()).toBeNull();
    });
  });

  describe('audio recording', () => {
    it('should upload recorded audio file', () => {
      audioUploadMock.uploadAudio.and.returnValue(of('https://example.com/recorded.webm'));

      const recordedFile: File = new File(['audio-data'], 'recording.webm', { type: 'audio/webm' });

      component.onAudioRecorded(recordedFile);

      expect(component.showRecorderSignal()).toBeFalse();
      expect(audioUploadMock.uploadAudio).toHaveBeenCalledWith(recordedFile);
      expect(component.audioPreviewSignal()).toBe('https://example.com/recorded.webm');
    });
  });

  describe('translation', () => {
    it('should fetch translation on front blur when languages are set', fakeAsync(() => {
      openRouterMock.translateText.and.returnValue(Promise.resolve('Cześć'));

      component.frontLanguageSignal.set('en');
      component.backLanguageSignal.set('pl');
      component.flashcardForm.patchValue({ front: 'Hello' });

      component.onFrontBlur();
      tick(600); // Wait for debounce timeout

      expect(openRouterMock.translateText).toHaveBeenCalledWith('Hello', 'en', 'pl');
      expect(component.translationSuggestionSignal()).toBe('Cześć');
      expect(component.translatingSignal()).toBeFalse();
    }));

    it('should not translate when languages are the same', fakeAsync(() => {
      component.frontLanguageSignal.set('en');
      component.backLanguageSignal.set('en');
      component.flashcardForm.patchValue({ front: 'Hello' });

      component.onFrontBlur();
      tick(600);

      expect(openRouterMock.translateText).not.toHaveBeenCalled();
      expect(component.translationSuggestionSignal()).toBeNull();
    }));

    it('should not translate when front language is not set', fakeAsync(() => {
      component.frontLanguageSignal.set(null);
      component.backLanguageSignal.set('pl');
      component.flashcardForm.patchValue({ front: 'Hello' });

      component.onFrontBlur();
      tick(600);

      expect(openRouterMock.translateText).not.toHaveBeenCalled();
    }));

    it('should not translate when front value is empty', fakeAsync(() => {
      component.frontLanguageSignal.set('en');
      component.backLanguageSignal.set('pl');
      component.flashcardForm.patchValue({ front: '' });

      component.onFrontBlur();
      tick(600);

      expect(openRouterMock.translateText).not.toHaveBeenCalled();
    }));

    it('should handle translation error gracefully', fakeAsync(() => {
      openRouterMock.translateText.and.callFake(() => {
        const p: Promise<string> = Promise.reject(new Error('Translation failed'));
        // Prevent unhandled rejection warning
        p.catch(() => {});
        return p;
      });

      component.frontLanguageSignal.set('en');
      component.backLanguageSignal.set('pl');
      component.flashcardForm.patchValue({ front: 'Hello' });

      component.onFrontBlur();
      tick(600);

      expect(component.translatingSignal()).toBeFalse();
      expect(component.translationSuggestionSignal()).toBeNull();
    }));

    it('should accept translation and set back value', fakeAsync(() => {
      openRouterMock.translateText.and.returnValue(Promise.resolve('Cześć'));

      component.frontLanguageSignal.set('en');
      component.backLanguageSignal.set('pl');
      component.flashcardForm.patchValue({ front: 'Hello', back: '' });

      component.onFrontBlur();
      tick(600);

      component.acceptTranslation();

      expect(component.flashcardForm.get('back')?.value).toBe('Cześć');
      expect(component.translationSuggestionSignal()).toBeNull();
    }));

    it('should append translation when back already has content', fakeAsync(() => {
      openRouterMock.translateText.and.returnValue(Promise.resolve('Cześć'));

      component.frontLanguageSignal.set('en');
      component.backLanguageSignal.set('pl');
      component.flashcardForm.patchValue({ front: 'Hello', back: 'Existing' });

      component.onFrontBlur();
      tick(600);

      component.acceptTranslation();

      expect(component.flashcardForm.get('back')?.value).toBe('Existing; Cześć');
    }));
  });

  describe('cancel', () => {
    it('should emit close event', () => {
      spyOn(component.close, 'emit');

      component.onCancel();

      expect(component.close.emit).toHaveBeenCalled();
    });
  });

  describe('not submit while uploading', () => {
    it('should not submit when image is uploading', () => {
      spyOn(component.save, 'emit');
      component.flashcardForm.patchValue({ front: 'Hello', back: 'Cześć' });
      component.uploadingSignal.set(true);

      component.onSubmit();

      expect(component.save.emit).not.toHaveBeenCalled();
    });

    it('should not submit when audio is uploading', () => {
      spyOn(component.save, 'emit');
      component.flashcardForm.patchValue({ front: 'Hello', back: 'Cześć' });
      component.audioUploadingSignal.set(true);

      component.onSubmit();

      expect(component.save.emit).not.toHaveBeenCalled();
    });
  });
});
