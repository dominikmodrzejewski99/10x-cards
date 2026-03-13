import { Component, OnInit, WritableSignal, signal, effect, inject, input, output, InputSignal, OutputEmitterRef, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FlashcardDTO } from '../../../../types';
import { ImageUploadService } from '../../../services/image-upload.service';

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
}

@Component({
  selector: 'app-flashcard-form',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule
  ],
  templateUrl: './flashcard-form.component.html',
  styleUrls: ['./flashcard-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FlashcardFormComponent implements OnInit {
  public flashcardToEditSignal: InputSignal<FlashcardDTO | null> = input<FlashcardDTO | null>(null, { alias: 'flashcardToEdit' });
  public isVisibleSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'isVisible' });

  public save: OutputEmitterRef<FlashcardFormData> = output<FlashcardFormData>();
  public close: OutputEmitterRef<void> = output<void>();

  private fb: FormBuilder = inject(FormBuilder);
  private imageUploadService: ImageUploadService = inject(ImageUploadService);

  public imagePreviewSignal: WritableSignal<string | null> = signal<string | null>(null);
  public uploadingSignal: WritableSignal<boolean> = signal<boolean>(false);
  public imageErrorSignal: WritableSignal<string | null> = signal<string | null>(null);

  public flashcardForm!: FormGroup;
  public submitting: boolean = false;

  public readonly FRONT_MAX_LENGTH: number = 200;
  public readonly BACK_MAX_LENGTH: number = 1000;

  private pendingImageUrl: string | null = null;

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
    if (this.flashcardForm.invalid || this.submitting || this.uploadingSignal()) {
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
      front_image_url: this.pendingImageUrl
    };

    const flashcard: FlashcardDTO | null = this.flashcardToEditSignal();
    if (flashcard) {
      formData.id = flashcard.id;
    }

    this.save.emit(formData);
    this.submitting = false;
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
    this.imageUploadService.uploadImage(file).subscribe({
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
      this.imageUploadService.deleteImage(currentUrl).subscribe();
    }
    this.pendingImageUrl = null;
    this.imagePreviewSignal.set(null);
    this.imageErrorSignal.set(null);
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
      } else {
        this.flashcardForm.reset();
        this.pendingImageUrl = null;
        this.imagePreviewSignal.set(null);
      }
      this.imageErrorSignal.set(null);
    }
  }
}
