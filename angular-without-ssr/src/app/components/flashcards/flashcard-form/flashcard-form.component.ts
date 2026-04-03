import { TranslocoDirective } from '@jsverse/transloco';
import { Component, OnInit, OnDestroy, WritableSignal, signal, effect, inject, input, output, InputSignal, OutputEmitterRef, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FlashcardDTO, FlashcardLanguage } from '../../../../types';
import { ImageUploadService } from '../../../services/image-upload.service';
import { OpenRouterService } from '../../../services/openrouter.service';
import { AudioUploadService } from '../../../services/audio-upload.service';
import { LoggerService } from '../../../services/logger.service';
import { AudioRecorderComponent } from '../../../shared/components/audio-recorder/audio-recorder.component';
import { AudioPlayerComponent } from '../../../shared/components/audio-player/audio-player.component';

export function noWhitespaceValidator() {
  return (control: { value: string }) => {
    const isWhitespace: boolean = (control.value || '').trim().length === 0;
    return isWhitespace ? { 'whitespace': true } : null;
  };
}

export interface FlashcardFormData {
  id?: number;
  front: string;
  back: string;
  front_image_url?: string | null;
  back_audio_url?: string | null;
  front_language?: FlashcardLanguage | null;
  back_language?: FlashcardLanguage | null;
}

@Component({
  selector: 'app-flashcard-form',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    AudioRecorderComponent,
    AudioPlayerComponent,
    TranslocoDirective
  ],
  templateUrl: './flashcard-form.component.html',
  styleUrls: ['./flashcard-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlashcardFormComponent implements OnInit, OnDestroy {
  public flashcardToEditSignal: InputSignal<FlashcardDTO | null> = input<FlashcardDTO | null>(null, { alias: 'flashcardToEdit' });
  public isVisibleSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'isVisible' });

  public save: OutputEmitterRef<FlashcardFormData> = output<FlashcardFormData>();
  public close: OutputEmitterRef<void> = output<void>();

  private fb: FormBuilder = inject(FormBuilder);
  private imageUploadService: ImageUploadService = inject(ImageUploadService);
  private openRouterService: OpenRouterService = inject(OpenRouterService);
  private audioUploadService: AudioUploadService = inject(AudioUploadService);
  private logger: LoggerService = inject(LoggerService);
  private destroyRef: DestroyRef = inject(DestroyRef);

  public imagePreviewSignal: WritableSignal<string | null> = signal<string | null>(null);
  public uploadingSignal: WritableSignal<boolean> = signal<boolean>(false);
  public imageErrorSignal: WritableSignal<string | null> = signal<string | null>(null);
  public translationSuggestionSignal: WritableSignal<string | null> = signal<string | null>(null);
  public translatingSignal: WritableSignal<boolean> = signal<boolean>(false);
  public frontLanguageSignal: WritableSignal<FlashcardLanguage | null> = signal<FlashcardLanguage | null>(null);
  public backLanguageSignal: WritableSignal<FlashcardLanguage | null> = signal<FlashcardLanguage | null>(null);

  public showLanguageSignal: WritableSignal<boolean> = signal<boolean>(false);
  public showImageSignal: WritableSignal<boolean> = signal<boolean>(false);
  public showAudioSignal: WritableSignal<boolean> = signal<boolean>(false);

  public audioPreviewSignal: WritableSignal<string | null> = signal<string | null>(null);
  public audioUploadingSignal: WritableSignal<boolean> = signal<boolean>(false);
  public audioErrorSignal: WritableSignal<string | null> = signal<string | null>(null);
  public showRecorderSignal: WritableSignal<boolean> = signal<boolean>(false);

  public readonly LANGUAGES: { label: string; value: FlashcardLanguage }[] = [
    { label: 'English', value: 'en' },
    { label: 'Polski', value: 'pl' },
    { label: 'Deutsch', value: 'de' },
    { label: 'Español', value: 'es' },
    { label: 'Français', value: 'fr' }
  ];

  public flashcardForm!: FormGroup;
  public submitting: boolean = false;

  public readonly FRONT_MAX_LENGTH: number = 200;
  public readonly BACK_MAX_LENGTH: number = 1000;

  private pendingImageUrl: string | null = null;
  private pendingAudioUrl: string | null = null;
  private translationTimeout: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor() {
    effect(() => {
      this.flashcardToEditSignal();
      this.isVisibleSignal();
      if (this.flashcardForm) {
        this.updateFormWithFlashcard();
      }
    });
  }

  public ngOnInit(): void {
    this.initializeForm();
  }

  public ngOnDestroy(): void {
    this.destroyed = true;
    if (this.translationTimeout) {
      clearTimeout(this.translationTimeout);
    }
  }

  public get frontControl() {
    return this.flashcardForm.get('front');
  }

  public get backControl() {
    return this.flashcardForm.get('back');
  }

  public hasError(controlName: string, errorName: string): boolean {
    const control = this.flashcardForm.get(controlName);
    return !!(control && control.touched && control.hasError(errorName));
  }

  public onSubmit(): void {
    if (this.flashcardForm.invalid || this.submitting || this.uploadingSignal() || this.audioUploadingSignal()) {
      Object.keys(this.flashcardForm.controls).forEach((key: string) => {
        const control = this.flashcardForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.submitting = true;

    const formValue = this.flashcardForm.value;
    const formData: FlashcardFormData = {
      front: formValue.front,
      back: formValue.back,
      front_image_url: this.pendingImageUrl,
      back_audio_url: this.pendingAudioUrl,
      front_language: this.frontLanguageSignal(),
      back_language: this.backLanguageSignal()
    };

    const flashcard: FlashcardDTO | null = this.flashcardToEditSignal();
    if (flashcard) {
      formData.id = flashcard.id;
    }

    this.save.emit(formData);
    this.submitting = false;
  }

  public onFrontBlur(): void {
    if (this.translationTimeout) {
      clearTimeout(this.translationTimeout);
    }

    const frontLang: FlashcardLanguage | null = this.frontLanguageSignal();
    const backLang: FlashcardLanguage | null = this.backLanguageSignal();
    const frontValue: string = this.flashcardForm.get('front')?.value?.trim() || '';

    if (!frontLang || !backLang || !frontValue || frontLang === backLang) {
      this.translationSuggestionSignal.set(null);
      return;
    }

    this.translationTimeout = setTimeout(() => {
      this.translatingSignal.set(true);
      this.translationSuggestionSignal.set(null);

      this.openRouterService.translateText(frontValue, frontLang, backLang)
        .then((translation: string) => {
          if (this.destroyed) return;
          this.translationSuggestionSignal.set(translation);
          this.translatingSignal.set(false);
        })
        .catch(() => {
          if (this.destroyed) return;
          this.translatingSignal.set(false);
        });
    }, 500);
  }

  public acceptTranslation(): void {
    const suggestion: string | null = this.translationSuggestionSignal();
    if (suggestion) {
      const currentBack: string = this.flashcardForm.get('back')?.value?.trim() || '';
      if (currentBack) {
        this.flashcardForm.patchValue({ back: currentBack + '; ' + suggestion });
      } else {
        this.flashcardForm.patchValue({ back: suggestion });
      }
      this.translationSuggestionSignal.set(null);
    }
  }

  public onCancel(): void {
    this.close.emit();
  }

  public onFileSelected(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;
    const file: File | undefined = input.files?.[0];
    if (!file) return;

    this.imageErrorSignal.set(null);

    const validationError: string | null = this.imageUploadService.validateFile(file);
    if (validationError) {
      this.imageErrorSignal.set(validationError);
      input.value = '';
      return;
    }

    this.uploadingSignal.set(true);
    this.imageUploadService.uploadImage(file).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (url: string) => {
        this.pendingImageUrl = url;
        this.imagePreviewSignal.set(url);
        this.uploadingSignal.set(false);
      },
      error: (err: Error) => {
        this.imageErrorSignal.set(err.message);
        this.uploadingSignal.set(false);
      }
    });

    input.value = '';
  }

  public removeImage(): void {
    const currentUrl: string | null = this.pendingImageUrl;
    if (currentUrl) {
      this.imageUploadService.deleteImage(currentUrl).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        error: (err: unknown) => this.logger.error('FlashcardForm.removeImage', err)
      });
    }
    this.pendingImageUrl = null;
    this.imagePreviewSignal.set(null);
    this.imageErrorSignal.set(null);
  }

  public onAudioFileSelected(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;
    const file: File | undefined = input.files?.[0];
    if (!file) return;

    this.uploadAudioFile(file);
    input.value = '';
  }

  public onAudioRecorded(file: File): void {
    this.showRecorderSignal.set(false);
    this.uploadAudioFile(file);
  }

  public removeAudio(): void {
    const currentUrl: string | null = this.pendingAudioUrl;
    if (currentUrl) {
      this.audioUploadService.deleteAudio(currentUrl).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        error: (err: unknown) => this.logger.error('FlashcardForm.removeAudio', err)
      });
    }
    this.pendingAudioUrl = null;
    this.audioPreviewSignal.set(null);
    this.audioErrorSignal.set(null);
  }

  public toggleRecorder(): void {
    this.showRecorderSignal.update((v: boolean) => !v);
  }

  private uploadAudioFile(file: File): void {
    this.audioErrorSignal.set(null);

    const validationError: string | null = this.audioUploadService.validateFile(file);
    if (validationError) {
      this.audioErrorSignal.set(validationError);
      return;
    }

    this.audioUploadingSignal.set(true);
    this.audioUploadService.uploadAudio(file).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (url: string) => {
        this.pendingAudioUrl = url;
        this.audioPreviewSignal.set(url);
        this.audioUploadingSignal.set(false);
      },
      error: (err: Error) => {
        this.audioErrorSignal.set(err.message);
        this.audioUploadingSignal.set(false);
      }
    });
  }

  private initializeForm(): void {
    this.flashcardForm = this.fb.group({
      front: ['', [
        Validators.required,
        Validators.maxLength(this.FRONT_MAX_LENGTH),
        noWhitespaceValidator()
      ]],
      back: ['', [
        Validators.required,
        Validators.maxLength(this.BACK_MAX_LENGTH),
        noWhitespaceValidator()
      ]]
    });

    this.updateFormWithFlashcard();
  }

  private updateFormWithFlashcard(): void {
    if (this.flashcardForm) {
      const flashcard: FlashcardDTO | null = this.flashcardToEditSignal();
      if (flashcard) {
        this.flashcardForm.patchValue({
          front: flashcard.front,
          back: flashcard.back
        });
        this.pendingImageUrl = flashcard.front_image_url || null;
        this.imagePreviewSignal.set(flashcard.front_image_url || null);
        this.pendingAudioUrl = flashcard.back_audio_url || null;
        this.audioPreviewSignal.set(flashcard.back_audio_url || null);
        this.frontLanguageSignal.set(flashcard.front_language || null);
        this.backLanguageSignal.set(flashcard.back_language || null);
        this.showLanguageSignal.set(!!flashcard.front_language || !!flashcard.back_language);
        this.showImageSignal.set(!!flashcard.front_image_url);
        this.showAudioSignal.set(!!flashcard.back_audio_url);
      } else {
        this.flashcardForm.reset();
        this.pendingImageUrl = null;
        this.imagePreviewSignal.set(null);
        this.pendingAudioUrl = null;
        this.audioPreviewSignal.set(null);
        this.showRecorderSignal.set(false);
        this.frontLanguageSignal.set(null);
        this.backLanguageSignal.set(null);
      }
      this.imageErrorSignal.set(null);
      this.audioErrorSignal.set(null);
      this.translationSuggestionSignal.set(null);
    }
  }
}
