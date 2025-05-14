import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FlashcardDTO } from '../../../../types';

// Custom validator to prevent whitespace-only values
export function noWhitespaceValidator() {
  return (control: { value: string }) => {
    const isWhitespace = (control.value || '').trim().length === 0;
    return isWhitespace ? { 'whitespace': true } : null;
  };
}

// Interfejs dla danych formularza
export interface FlashcardFormData {
  id?: number;
  front: string;
  back: string;
}

@Component({
  selector: 'app-flashcard-form',
  standalone: true,
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
export class FlashcardFormComponent implements OnInit, OnChanges {
  @Input() flashcardToEdit: FlashcardDTO | null = null;
  @Input() isVisible: boolean = false;

  @Output() save = new EventEmitter<FlashcardFormData>();
  @Output() close = new EventEmitter<void>();

  flashcardForm!: FormGroup;
  submitting: boolean = false;

  // Maksymalne długości pól
  readonly FRONT_MAX_LENGTH = 200;
  readonly BACK_MAX_LENGTH = 500;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Jeśli zmienił się flashcardToEdit i formularz już istnieje
    if (changes['flashcardToEdit'] && this.flashcardForm) {
      this.updateFormWithFlashcard();
    }

    // Jeśli modal został otwarty
    if (changes['isVisible'] && changes['isVisible'].currentValue === true) {
      this.updateFormWithFlashcard();
    }
  }

  // Inicjalizacja formularza
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

  // Aktualizacja formularza danymi z fiszki (w trybie edycji)
  private updateFormWithFlashcard(): void {
    if (this.flashcardForm) {
      if (this.flashcardToEdit) {
        this.flashcardForm.patchValue({
          front: this.flashcardToEdit.front,
          back: this.flashcardToEdit.back
        });
      } else {
        this.flashcardForm.reset();
      }
    }
  }

  // Wysłanie formularza
  onSubmit(): void {
    if (this.flashcardForm.invalid || this.submitting) {
      // Oznacz wszystkie pola jako dotknięte, aby pokazać błędy walidacji
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

    // Dodanie id, jeśli jesteśmy w trybie edycji
    if (this.flashcardToEdit) {
      formData.id = this.flashcardToEdit.id;
    }

    this.save.emit(formData);
    this.submitting = false;
  }

  // Anulowanie i zamknięcie formularza
  onCancel(): void {
    this.close.emit();
  }

  // Gettery do obsługi błędów walidacji

  get frontControl() {
    return this.flashcardForm.get('front');
  }

  get backControl() {
    return this.flashcardForm.get('back');
  }

  // Sprawdzenie czy kontrolka ma błąd konkretnego typu
  hasError(controlName: string, errorName: string): boolean {
    const control = this.flashcardForm.get(controlName);
    return !!(control && control.touched && control.hasError(errorName));
  }
}