import { TranslocoDirective } from '@jsverse/transloco';
import { Component, OnInit, signal, effect, input, output, inject, InputSignal, OutputEmitterRef, ChangeDetectionStrategy, Signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FlashcardDTO, FlashcardLanguage } from '../../../../types';
import { AudioRecorderComponent } from '../../../shared/components/audio-recorder/audio-recorder.component';
import { AudioPlayerComponent } from '../../../shared/components/audio-player/audio-player.component';
import { WebSpeechService } from '../../../services/infrastructure/web-speech.service';
import { FlashcardFormData } from '../../../shared/models';

export function noWhitespaceValidator() {
  return (control: { value: string }) => {
    const isWhitespace: boolean = (control.value || '').trim().length === 0;
    return isWhitespace ? { 'whitespace': true } : null;
  };
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
export class FlashcardFormComponent implements OnInit {
  // Inputs from parent
  public flashcardToEditSignal: InputSignal<FlashcardDTO | null> = input<FlashcardDTO | null>(null, { alias: 'flashcardToEdit' });
  public isVisibleSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'isVisible' });
  public imagePreviewSignal: InputSignal<string | null> = input<string | null>(null, { alias: 'imagePreview' });
  public uploadingSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'imageUploading' });
  public imageErrorSignal: InputSignal<string | null> = input<string | null>(null, { alias: 'imageError' });
  public audioPreviewSignal: InputSignal<string | null> = input<string | null>(null, { alias: 'audioPreview' });
  public audioUploadingSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'audioUploading' });
  public audioErrorSignal: InputSignal<string | null> = input<string | null>(null, { alias: 'audioError' });
  public translationSuggestionSignal: InputSignal<string | null> = input<string | null>(null, { alias: 'translationSuggestion' });
  public translatingSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'translating' });

  // Outputs
  public save: OutputEmitterRef<FlashcardFormData> = output<FlashcardFormData>();
  public close: OutputEmitterRef<void> = output<void>();
  public imageSelected: OutputEmitterRef<File> = output<File>();
  public imageRemoved: OutputEmitterRef<void> = output<void>();
  public audioFileSelected: OutputEmitterRef<File> = output<File>();
  public audioRecorded: OutputEmitterRef<File> = output<File>();
  public audioRemoved: OutputEmitterRef<void> = output<void>();
  public translationRequested: OutputEmitterRef<{ text: string; fromLang: FlashcardLanguage; toLang: FlashcardLanguage }> = output<{ text: string; fromLang: FlashcardLanguage; toLang: FlashcardLanguage }>();
  public translationAccepted: OutputEmitterRef<void> = output<void>();
  public ttsRequested: OutputEmitterRef<{ text: string; lang: FlashcardLanguage | null }> = output<{ text: string; lang: FlashcardLanguage | null }>();

  private readonly webSpeech: WebSpeechService = inject(WebSpeechService);
  public readonly speechSupported: boolean = this.webSpeech.isSupported();
  public readonly speakingSignal: Signal<boolean> = this.webSpeech.speakingSignal;

  private fb: FormBuilder = new FormBuilder();

  public frontLanguageSignal = signal<FlashcardLanguage | null>(null);
  public backLanguageSignal = signal<FlashcardLanguage | null>(null);
  public showLanguageSignal = signal<boolean>(false);
  public showImageSignal = signal<boolean>(false);
  public showAudioSignal = signal<boolean>(false);
  public showRecorderSignal = signal<boolean>(false);

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
      front_image_url: this.imagePreviewSignal(),
      back_audio_url: this.audioPreviewSignal(),
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
    const frontLang: FlashcardLanguage | null = this.frontLanguageSignal();
    const backLang: FlashcardLanguage | null = this.backLanguageSignal();
    const frontValue: string = this.flashcardForm.get('front')?.value?.trim() || '';

    if (!frontLang || !backLang || !frontValue || frontLang === backLang) {
      return;
    }

    this.translationRequested.emit({ text: frontValue, fromLang: frontLang, toLang: backLang });
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
      this.translationAccepted.emit();
    }
  }

  public onCancel(): void {
    this.close.emit();
  }

  public onFileSelected(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;
    const file: File | undefined = input.files?.[0];
    if (!file) return;
    this.imageSelected.emit(file);
    input.value = '';
  }

  public removeImage(): void {
    this.imageRemoved.emit();
  }

  public onAudioFileSelected(event: Event): void {
    const input: HTMLInputElement = event.target as HTMLInputElement;
    const file: File | undefined = input.files?.[0];
    if (!file) return;
    this.audioFileSelected.emit(file);
    input.value = '';
  }

  public onAudioRecorded(file: File): void {
    this.showRecorderSignal.set(false);
    this.audioRecorded.emit(file);
  }

  public removeAudio(): void {
    this.audioRemoved.emit();
  }

  public previewBackSpeech(): void {
    if (this.speakingSignal()) {
      this.webSpeech.stop();
      return;
    }
    const text: string = this.flashcardForm.get('back')?.value?.trim() || '';
    if (!text) return;
    this.webSpeech.speak(text, this.backLanguageSignal());
  }

  public requestTtsForBack(): void {
    const text: string = this.flashcardForm.get('back')?.value?.trim() || '';
    if (!text) return;
    this.ttsRequested.emit({ text, lang: this.backLanguageSignal() });
  }

  public toggleRecorder(): void {
    this.showRecorderSignal.update((v: boolean) => !v);
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
        this.frontLanguageSignal.set(flashcard.front_language || null);
        this.backLanguageSignal.set(flashcard.back_language || null);
        this.showLanguageSignal.set(!!flashcard.front_language || !!flashcard.back_language);
        this.showImageSignal.set(!!flashcard.front_image_url);
        this.showAudioSignal.set(!!flashcard.back_audio_url);
      } else {
        this.flashcardForm.reset();
        this.showRecorderSignal.set(false);
        this.frontLanguageSignal.set(null);
        this.backLanguageSignal.set(null);
      }
    }
  }
}
