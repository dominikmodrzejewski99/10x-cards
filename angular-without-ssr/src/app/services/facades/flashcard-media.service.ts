import { Injectable, inject, signal, Signal, WritableSignal } from '@angular/core';
import { ImageUploadService } from '../infrastructure/image-upload.service';
import { AudioUploadService } from '../infrastructure/audio-upload.service';
import { TtsApiService } from '../infrastructure/tts-api.service';
import { OpenRouterService } from '../domain/openrouter.service';
import { LoggerService } from '../infrastructure/logger.service';
import { FlashcardDTO, FlashcardLanguage } from '../../../types';

@Injectable({ providedIn: 'root' })
export class FlashcardMediaService {
  private readonly imageUploadService: ImageUploadService = inject(ImageUploadService);
  private readonly audioUploadService: AudioUploadService = inject(AudioUploadService);
  private readonly ttsApiService: TtsApiService = inject(TtsApiService);
  private readonly openRouterService: OpenRouterService = inject(OpenRouterService);
  private readonly logger: LoggerService = inject(LoggerService);

  private readonly _imagePreview: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _imageUploading: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _imageError: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _audioPreview: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _audioUploading: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _audioError: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _translationSuggestion: WritableSignal<string | null> = signal<string | null>(null);
  private readonly _translating: WritableSignal<boolean> = signal<boolean>(false);

  public readonly imagePreviewSignal: Signal<string | null> = this._imagePreview.asReadonly();
  public readonly imageUploadingSignal: Signal<boolean> = this._imageUploading.asReadonly();
  public readonly imageErrorSignal: Signal<string | null> = this._imageError.asReadonly();
  public readonly audioPreviewSignal: Signal<string | null> = this._audioPreview.asReadonly();
  public readonly audioUploadingSignal: Signal<boolean> = this._audioUploading.asReadonly();
  public readonly audioErrorSignal: Signal<string | null> = this._audioError.asReadonly();
  public readonly translationSuggestionSignal: Signal<string | null> = this._translationSuggestion.asReadonly();
  public readonly translatingSignal: Signal<boolean> = this._translating.asReadonly();

  public uploadImage(file: File): void {
    this._imageError.set(null);
    const validationError: string | null = this.imageUploadService.validateFile(file);
    if (validationError) {
      this._imageError.set(validationError);
      return;
    }
    this._imageUploading.set(true);
    this.imageUploadService.uploadImage(file).subscribe({
      next: (url: string) => {
        this._imagePreview.set(url);
        this._imageUploading.set(false);
      },
      error: (err: Error) => {
        this._imageError.set(err.message);
        this._imageUploading.set(false);
      }
    });
  }

  public deleteImage(): void {
    const currentUrl: string | null = this._imagePreview();
    if (currentUrl) {
      this.imageUploadService.deleteImage(currentUrl).subscribe({
        error: (err: unknown) => this.logger.error('FlashcardMedia.deleteImage', err)
      });
    }
    this._imagePreview.set(null);
    this._imageError.set(null);
  }

  public uploadAudio(file: File): void {
    this._audioError.set(null);
    const validationError: string | null = this.audioUploadService.validateFile(file);
    if (validationError) {
      this._audioError.set(validationError);
      return;
    }
    this._audioUploading.set(true);
    this.audioUploadService.uploadAudio(file).subscribe({
      next: (url: string) => {
        this._audioPreview.set(url);
        this._audioUploading.set(false);
      },
      error: (err: Error) => {
        this._audioError.set(err.message);
        this._audioUploading.set(false);
      }
    });
  }

  public generateTtsAudio(text: string, lang: FlashcardLanguage | null): void {
    this._audioError.set(null);
    if (!text.trim()) {
      return;
    }
    this._audioUploading.set(true);
    this.ttsApiService.generateAudio(text, lang).subscribe({
      next: (blob: Blob) => {
        const file: File = new File([blob], `tts-${Date.now()}.wav`, { type: 'audio/wav' });
        this.audioUploadService.uploadAudio(file).subscribe({
          next: (url: string) => {
            this._audioPreview.set(url);
            this._audioUploading.set(false);
          },
          error: (err: Error) => {
            this._audioError.set(err.message);
            this._audioUploading.set(false);
          }
        });
      },
      error: (err: Error) => {
        this._audioError.set(err.message);
        this._audioUploading.set(false);
      }
    });
  }

  public deleteAudio(): void {
    const currentUrl: string | null = this._audioPreview();
    if (currentUrl) {
      this.audioUploadService.deleteAudio(currentUrl).subscribe({
        error: (err: unknown) => this.logger.error('FlashcardMedia.deleteAudio', err)
      });
    }
    this._audioPreview.set(null);
    this._audioError.set(null);
  }

  public requestTranslation(text: string, fromLang: FlashcardLanguage, toLang: FlashcardLanguage): void {
    this._translating.set(true);
    this._translationSuggestion.set(null);
    this.openRouterService.translateText(text, fromLang, toLang)
      .then((translation: string) => {
        this._translationSuggestion.set(translation);
        this._translating.set(false);
      })
      .catch((err: unknown) => {
        this.logger.error('FlashcardMedia.requestTranslation', err);
        this._translating.set(false);
      });
  }

  public clearTranslationSuggestion(): void {
    this._translationSuggestion.set(null);
  }

  public reset(): void {
    this._imagePreview.set(null);
    this._imageUploading.set(false);
    this._imageError.set(null);
    this._audioPreview.set(null);
    this._audioUploading.set(false);
    this._audioError.set(null);
    this._translationSuggestion.set(null);
    this._translating.set(false);
  }

  public initForFlashcard(flashcard: FlashcardDTO | null): void {
    this.reset();
    if (flashcard) {
      this._imagePreview.set(flashcard.front_image_url || null);
      this._audioPreview.set(flashcard.back_audio_url || null);
    }
  }
}
