import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { FlashcardFormComponent } from './flashcard-form.component';
import { FlashcardFormData } from '../../../shared/models';
import { FlashcardDTO, FlashcardLanguage } from '../../../../types';

@Component({
  template: `
    <app-flashcard-form
      [flashcardToEdit]="flashcardToEdit"
      [isVisible]="isVisible"
      [imagePreview]="imagePreview"
      [imageUploading]="imageUploading"
      [imageError]="imageError"
      [audioPreview]="audioPreview"
      [audioUploading]="audioUploading"
      [audioError]="audioError"
      [translationSuggestion]="translationSuggestion"
      [translating]="translating"
      (save)="onSave($event)"
      (close)="onClose()"
      (imageSelected)="onImageSelected($event)"
      (imageRemoved)="onImageRemoved()"
      (audioFileSelected)="onAudioFileSelected($event)"
      (audioRecorded)="onAudioRecorded($event)"
      (audioRemoved)="onAudioRemoved()"
      (translationRequested)="onTranslationRequested($event)"
      (translationAccepted)="onTranslationAccepted()"
    />
  `,
  imports: [FlashcardFormComponent]
})
class TestHostComponent {
  public flashcardToEdit: FlashcardDTO | null = null;
  public isVisible: boolean = true;
  public imagePreview: string | null = null;
  public imageUploading: boolean = false;
  public imageError: string | null = null;
  public audioPreview: string | null = null;
  public audioUploading: boolean = false;
  public audioError: string | null = null;
  public translationSuggestion: string | null = null;
  public translating: boolean = false;

  public savedData: FlashcardFormData | null = null;
  public closeCalled: boolean = false;
  public selectedImage: File | null = null;
  public imageRemovedCalled: boolean = false;
  public selectedAudioFile: File | null = null;
  public recordedAudio: File | null = null;
  public audioRemovedCalled: boolean = false;
  public translationRequestedEvent: { text: string; fromLang: FlashcardLanguage; toLang: FlashcardLanguage } | null = null;
  public translationAcceptedCalled: boolean = false;

  public onSave(data: FlashcardFormData): void {
    this.savedData = data;
  }
  public onClose(): void {
    this.closeCalled = true;
  }
  public onImageSelected(file: File): void {
    this.selectedImage = file;
  }
  public onImageRemoved(): void {
    this.imageRemovedCalled = true;
  }
  public onAudioFileSelected(file: File): void {
    this.selectedAudioFile = file;
  }
  public onAudioRecorded(file: File): void {
    this.recordedAudio = file;
  }
  public onAudioRemoved(): void {
    this.audioRemovedCalled = true;
  }
  public onTranslationRequested(event: { text: string; fromLang: FlashcardLanguage; toLang: FlashcardLanguage }): void {
    this.translationRequestedEvent = event;
  }
  public onTranslationAccepted(): void {
    this.translationAcceptedCalled = true;
  }
}

describe('FlashcardFormComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let component: FlashcardFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TestHostComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' }
        })
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();

    component = fixture.debugElement.children[0].componentInstance as FlashcardFormComponent;
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
      component.flashcardForm.patchValue({ front: 'Hello', back: 'Cze\u015b\u0107' });

      expect(component.flashcardForm.valid).toBeTrue();
    });
  });

  describe('onSubmit', () => {
    it('should not emit save when form is invalid', () => {
      component.flashcardForm.patchValue({ front: '', back: '' });

      component.onSubmit();

      expect(host.savedData).toBeNull();
    });

    it('should emit save with form data including imagePreview and audioPreview from inputs', () => {
      host.imagePreview = 'https://example.com/image.png';
      host.audioPreview = 'https://example.com/audio.webm';
      fixture.detectChanges();

      component.flashcardForm.patchValue({ front: 'Hello', back: 'Cze\u015b\u0107' });
      component.frontLanguageSignal.set('en');
      component.backLanguageSignal.set('pl');

      component.onSubmit();

      expect(host.savedData).toEqual(jasmine.objectContaining({
        front: 'Hello',
        back: 'Cze\u015b\u0107',
        front_image_url: 'https://example.com/image.png',
        back_audio_url: 'https://example.com/audio.webm',
        front_language: 'en',
        back_language: 'pl'
      }));
    });

    it('should emit save with null image and audio when inputs are not set', () => {
      component.flashcardForm.patchValue({ front: 'Hello', back: 'Cze\u015b\u0107' });

      component.onSubmit();

      expect(host.savedData).toEqual(jasmine.objectContaining({
        front: 'Hello',
        back: 'Cze\u015b\u0107',
        front_image_url: null,
        back_audio_url: null
      }));
    });

    it('should include flashcard id when editing an existing flashcard', () => {
      host.flashcardToEdit = {
        id: 42,
        front: 'Old front',
        back: 'Old back',
        front_image_url: null,
        back_audio_url: null,
        front_language: null,
        back_language: null,
        source: 'manual',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        user_id: 'user-1',
        generation_id: null,
        set_id: 1,
        position: 0
      };
      fixture.detectChanges();

      component.flashcardForm.patchValue({ front: 'Updated front', back: 'Updated back' });

      component.onSubmit();

      expect(host.savedData?.id).toBe(42);
    });

    it('should not submit when image is uploading', () => {
      host.imageUploading = true;
      fixture.detectChanges();

      component.flashcardForm.patchValue({ front: 'Hello', back: 'Cze\u015b\u0107' });

      component.onSubmit();

      expect(host.savedData).toBeNull();
    });

    it('should not submit when audio is uploading', () => {
      host.audioUploading = true;
      fixture.detectChanges();

      component.flashcardForm.patchValue({ front: 'Hello', back: 'Cze\u015b\u0107' });

      component.onSubmit();

      expect(host.savedData).toBeNull();
    });
  });

  describe('image outputs', () => {
    it('should emit imageSelected when onFileSelected is called with a file', () => {
      const mockFile: File = new File(['data'], 'test.png', { type: 'image/png' });
      const mockEvent: Partial<Event> = {
        target: { files: [mockFile], value: '' } as unknown as EventTarget
      };

      component.onFileSelected(mockEvent as Event);

      expect(host.selectedImage).toBe(mockFile);
    });

    it('should not emit imageSelected when no file is provided', () => {
      const mockEvent: Partial<Event> = {
        target: { files: [], value: '' } as unknown as EventTarget
      };

      component.onFileSelected(mockEvent as Event);

      expect(host.selectedImage).toBeNull();
    });

    it('should emit imageRemoved when removeImage is called', () => {
      component.removeImage();

      expect(host.imageRemovedCalled).toBeTrue();
    });
  });

  describe('audio outputs', () => {
    it('should emit audioFileSelected when onAudioFileSelected is called with a file', () => {
      const mockFile: File = new File(['data'], 'test.webm', { type: 'audio/webm' });
      const mockEvent: Partial<Event> = {
        target: { files: [mockFile], value: '' } as unknown as EventTarget
      };

      component.onAudioFileSelected(mockEvent as Event);

      expect(host.selectedAudioFile).toBe(mockFile);
    });

    it('should not emit audioFileSelected when no file is provided', () => {
      const mockEvent: Partial<Event> = {
        target: { files: [], value: '' } as unknown as EventTarget
      };

      component.onAudioFileSelected(mockEvent as Event);

      expect(host.selectedAudioFile).toBeNull();
    });

    it('should emit audioRecorded and hide recorder when onAudioRecorded is called', () => {
      component.showRecorderSignal.set(true);

      const recordedFile: File = new File(['audio-data'], 'recording.webm', { type: 'audio/webm' });
      component.onAudioRecorded(recordedFile);

      expect(host.recordedAudio).toBe(recordedFile);
      expect(component.showRecorderSignal()).toBeFalse();
    });

    it('should emit audioRemoved when removeAudio is called', () => {
      component.removeAudio();

      expect(host.audioRemovedCalled).toBeTrue();
    });
  });

  describe('translation', () => {
    it('should emit translationRequested with correct params on front blur when languages are set', () => {
      component.frontLanguageSignal.set('en');
      component.backLanguageSignal.set('pl');
      component.flashcardForm.patchValue({ front: 'Hello' });

      component.onFrontBlur();

      expect(host.translationRequestedEvent).toEqual({
        text: 'Hello',
        fromLang: 'en',
        toLang: 'pl'
      });
    });

    it('should not emit translationRequested when languages are the same', () => {
      component.frontLanguageSignal.set('en');
      component.backLanguageSignal.set('en');
      component.flashcardForm.patchValue({ front: 'Hello' });

      component.onFrontBlur();

      expect(host.translationRequestedEvent).toBeNull();
    });

    it('should not emit translationRequested when front language is not set', () => {
      component.frontLanguageSignal.set(null);
      component.backLanguageSignal.set('pl');
      component.flashcardForm.patchValue({ front: 'Hello' });

      component.onFrontBlur();

      expect(host.translationRequestedEvent).toBeNull();
    });

    it('should not emit translationRequested when back language is not set', () => {
      component.frontLanguageSignal.set('en');
      component.backLanguageSignal.set(null);
      component.flashcardForm.patchValue({ front: 'Hello' });

      component.onFrontBlur();

      expect(host.translationRequestedEvent).toBeNull();
    });

    it('should not emit translationRequested when front value is empty', () => {
      component.frontLanguageSignal.set('en');
      component.backLanguageSignal.set('pl');
      component.flashcardForm.patchValue({ front: '' });

      component.onFrontBlur();

      expect(host.translationRequestedEvent).toBeNull();
    });

    it('should not emit translationRequested when front value is only whitespace', () => {
      component.frontLanguageSignal.set('en');
      component.backLanguageSignal.set('pl');
      component.flashcardForm.patchValue({ front: '   ' });

      component.onFrontBlur();

      expect(host.translationRequestedEvent).toBeNull();
    });

    it('should patch back field and emit translationAccepted when acceptTranslation is called', () => {
      host.translationSuggestion = 'Cze\u015b\u0107';
      fixture.detectChanges();

      component.flashcardForm.patchValue({ front: 'Hello', back: '' });

      component.acceptTranslation();

      expect(component.flashcardForm.get('back')?.value).toBe('Cze\u015b\u0107');
      expect(host.translationAcceptedCalled).toBeTrue();
    });

    it('should append translation when back already has content', () => {
      host.translationSuggestion = 'Cze\u015b\u0107';
      fixture.detectChanges();

      component.flashcardForm.patchValue({ front: 'Hello', back: 'Existing' });

      component.acceptTranslation();

      expect(component.flashcardForm.get('back')?.value).toBe('Existing; Cze\u015b\u0107');
      expect(host.translationAcceptedCalled).toBeTrue();
    });

    it('should not patch form when translationSuggestion is null', () => {
      host.translationSuggestion = null;
      fixture.detectChanges();

      component.flashcardForm.patchValue({ front: 'Hello', back: 'Existing' });

      component.acceptTranslation();

      expect(component.flashcardForm.get('back')?.value).toBe('Existing');
      expect(host.translationAcceptedCalled).toBeFalse();
    });
  });

  describe('cancel', () => {
    it('should emit close event', () => {
      component.onCancel();

      expect(host.closeCalled).toBeTrue();
    });
  });

  describe('inputs propagation', () => {
    it('should receive imagePreview input', () => {
      host.imagePreview = 'https://example.com/image.png';
      fixture.detectChanges();

      expect(component.imagePreviewSignal()).toBe('https://example.com/image.png');
    });

    it('should receive imageUploading input', () => {
      host.imageUploading = true;
      fixture.detectChanges();

      expect(component.uploadingSignal()).toBeTrue();
    });

    it('should receive imageError input', () => {
      host.imageError = 'Upload failed';
      fixture.detectChanges();

      expect(component.imageErrorSignal()).toBe('Upload failed');
    });

    it('should receive audioPreview input', () => {
      host.audioPreview = 'https://example.com/audio.webm';
      fixture.detectChanges();

      expect(component.audioPreviewSignal()).toBe('https://example.com/audio.webm');
    });

    it('should receive audioUploading input', () => {
      host.audioUploading = true;
      fixture.detectChanges();

      expect(component.audioUploadingSignal()).toBeTrue();
    });

    it('should receive audioError input', () => {
      host.audioError = 'Audio upload failed';
      fixture.detectChanges();

      expect(component.audioErrorSignal()).toBe('Audio upload failed');
    });

    it('should receive translationSuggestion input', () => {
      host.translationSuggestion = 'Translated text';
      fixture.detectChanges();

      expect(component.translationSuggestionSignal()).toBe('Translated text');
    });

    it('should receive translating input', () => {
      host.translating = true;
      fixture.detectChanges();

      expect(component.translatingSignal()).toBeTrue();
    });
  });
});
