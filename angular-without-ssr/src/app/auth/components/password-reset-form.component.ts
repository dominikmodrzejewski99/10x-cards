import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-password-reset-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <form [formGroup]="resetForm" (ngSubmit)="onSubmit()">
      <div class="form-field">
        <label for="email">Email</label>
        <input
          type="email"
          id="email"
          formControlName="email"
          placeholder="Wprowadź swój adres email"
        />
        <div *ngIf="submitted && f['email'].errors" class="error-message">
          <span *ngIf="f['email'].errors['required']">Email jest wymagany</span>
          <span *ngIf="f['email'].errors['email']">Niepoprawny format email</span>
        </div>
      </div>

      <button
        type="submit"
        class="submit-button"
        [disabled]="loading">
        Wyślij link resetujący
        <span *ngIf="loading">...</span>
      </button>

      <div *ngIf="error" class="error-message global-error">
        {{ error }}
      </div>

      <div *ngIf="success" class="success-message">
        {{ success }}
      </div>

      <div class="auth-footer">
        <p>
          Pamiętasz swoje hasło?
          <a routerLink="/login">
            Zaloguj się
          </a>
        </p>
      </div>
    </form>
  `,
  styles: [`
    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }

    input {
      padding: 0.75rem 0.875rem;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      font-size: 0.9375rem;
      color: #1f2937;
      transition: all 0.2s;
      background-color: #ffffff;
      width: 100%;
      box-sizing: border-box;
    }

    /* Style dla autouzupełniania w przeglądarce */
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
      -webkit-text-fill-color: #1f2937 !important;
      background-color: #ffffff !important;
    }

    input::placeholder {
      color: #9ca3af;
      font-size: 0.875rem;
    }

    input:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
      color: #1f2937 !important;
    }

    .submit-button {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background-color: #2563eb;
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.9375rem;
      cursor: pointer;
      transition: background-color 0.2s;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      width: 100%;
    }

    .submit-button:hover {
      background-color: #1d4ed8;
    }

    .submit-button:disabled {
      background-color: #93c5fd;
      cursor: not-allowed;
    }

    .error-message {
      color: #dc2626;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .global-error {
      margin-top: 1rem;
      text-align: center;
      padding: 0.75rem;
      background-color: #fee2e2;
      border-radius: 0.375rem;
      border: 1px solid #fecaca;
      font-size: 0.875rem;
    }

    .success-message {
      margin-top: 1rem;
      text-align: center;
      padding: 0.75rem;
      background-color: #d1fae5;
      border-radius: 0.375rem;
      border: 1px solid #a7f3d0;
      color: #065f46;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .auth-footer {
      margin-top: 1.25rem;
      text-align: center;
      color: #4b5563;
      font-size: 0.8125rem;
    }

    .auth-footer a {
      color: #2563eb;
      font-weight: 500;
      text-decoration: none;
      margin-left: 0.25rem;
      transition: all 0.2s;
    }

    .auth-footer a:hover {
      text-decoration: underline;
      color: #1d4ed8;
    }

    @media (min-width: 480px) {
      form {
        gap: 1.25rem;
      }

      .form-field {
        gap: 0.5rem;
      }

      input {
        padding: 0.75rem 1rem;
        font-size: 1rem;
      }

      input::placeholder {
        font-size: 0.9375rem;
      }

      .submit-button {
        padding: 0.875rem;
        font-size: 1rem;
      }

      .error-message {
        font-size: 0.875rem;
      }

      .auth-footer {
        margin-top: 1.5rem;
        font-size: 0.875rem;
      }
    }

    @media (max-width: 359px) {
      input {
        padding: 0.625rem 0.75rem;
        font-size: 0.875rem;
      }

      .submit-button {
        padding: 0.625rem;
        font-size: 0.875rem;
      }

      .auth-footer {
        font-size: 0.75rem;
      }
    }
  `]
})
export class PasswordResetFormComponent implements OnInit {
  @Output() resetPassword = new EventEmitter<{email: string}>();

  resetForm!: FormGroup;
  submitted = false;
  loading = false;
  error = '';
  success = '';

  constructor(
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get f() {
    return this.resetForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.success = '';

    if (this.resetForm.invalid) {
      return;
    }

    this.loading = true;

    const { email } = this.resetForm.value;

    this.resetPassword.emit({ email });

    setTimeout(() => {
      this.loading = false;
      this.success = `Link do resetowania hasła został wysłany na adres ${email}`;
      this.resetForm.reset();
      this.submitted = false;
    }, 1500);
  }
}
