import { Component, OnInit, effect, inject, input, output, InputSignal, OutputEmitterRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FlashcardDTO } from '../../../../types';

export function noWhitespaceValidator() {
  return (control: { value: string }) => {
    const isWhitespace = (control.value || '').trim().length === 0;
    return isWhitespace ? { 'whitespace': true } : null;
  };
}

export interface FlashcardFormData {
  id?: number;
  front: string;
  back: string;
}

@Component({
  selector: 'app-flashcard-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule
  ],
  templateUrl: './flashcard-form.component.html',
  styleUrls: ['./flashcard-form.component.css']
})
export class FlashcardFormComponent implements OnInit {
  private fb = inject(FormBuilder);

  public flashcardToEditSignal: InputSignal<FlashcardDTO | null> = input<FlashcardDTO | null>(null, { alias: 'flashcardToEdit' });
  public isVisibleSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'isVisible' });

  public save: OutputEmitterRef<FlashcardFormData> = output<FlashcardFormData>();
  public close: OutputEmitterRef<void> = output<void>();

  flashcardForm!: FormGroup;
  submitting: boolean = false;

  readonly FRONT_MAX_LENGTH = 200;
  readonly BACK_MAX_LENGTH = 500;

  constructor() {
    effect(() => {
      const _flashcard = this.flashcardToEditSignal();
      const _visible = this.isVisibleSignal();
      if (this.flashcardForm) {
        this.updateFormWithFlashcard();
      }
    });
  }

  ngOnInit(): void {
    this.initializeForm();
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
      const flashcard = this.flashcardToEditSignal();
      if (flashcard) {
        this.flashcardForm.patchValue({
          front: flashcard.front,
          back: flashcard.back
        });
      } else {
        this.flashcardForm.reset();
      }
    }
  }

  onSubmit(): void {
    if (this.flashcardForm.invalid || this.submitting) {
      Object.keys(this.flashcardForm.controls).forEach(key => {
        const control = this.flashcardForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.submitting = true;

    const formValue = this.flashcardForm.value;
    const formData: FlashcardFormData = {
      front: formValue.front,
      back: formValue.back
    };

    const flashcard = this.flashcardToEditSignal();
    if (flashcard) {
      formData.id = flashcard.id;
    }

    this.save.emit(formData);
    this.submitting = false;
  }

  onCancel(): void {
    this.close.emit();
  }

  get frontControl() {
    return this.flashcardForm.get('front');
  }

  get backControl() {
    return this.flashcardForm.get('back');
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.flashcardForm.get(controlName);
    return !!(control && control.touched && control.hasError(errorName));
  }
}
