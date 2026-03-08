import { ChangeDetectionStrategy, Component, inject, OnInit, output, OutputEmitterRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-password-reset-form',
  imports: [ReactiveFormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
        @if (submitted && f['email'].errors) {
          <div class="error-message">
            @if (f['email'].errors['required']) {
              <span>Email jest wymagany</span>
            }
            @if (f['email'].errors['email']) {
              <span>Niepoprawny format email</span>
            }
          </div>
        }
      </div>

      <button
        type="submit"
        class="submit-button"
        [disabled]="loading">
        Wyślij link resetujący
        @if (loading) {
          <span>...</span>
        }
      </button>

      @if (error) {
        <div class="error-message global-error">
          {{ error }}
        </div>
      }

      @if (success) {
        <div class="success-message">
          {{ success }}
        </div>
      }

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
      color: #282e3e;
    }

    input {
      padding: 0.75rem 0.875rem;
      border: 1px solid #d9dbe9;
      border-radius: 0.5rem;
      font-size: 0.9375rem;
      color: #282e3e;
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
      -webkit-box-shadow: 0 0 0px 1000px #ffffff inset;
      -webkit-text-fill-color: #282e3e;
      background-color: #ffffff;
    }

    input::placeholder {
      color: #b0b5c4;
      font-size: 0.875rem;
    }

    input:focus {
      outline: none;
      border-color: #4255ff;
      box-shadow: 0 0 0 3px rgba(66, 85, 255, 0.12);
      color: #282e3e;
    }

    .submit-button {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background-color: #4255ff;
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
      background-color: #3b4ce3;
    }

    .submit-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .error-message {
      color: #ff6240;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .global-error {
      margin-top: 1rem;
      text-align: center;
      padding: 0.75rem;
      background-color: #fff0ed;
      border-radius: 0.375rem;
      border: 1px solid #ffcfc5;
      font-size: 0.875rem;
    }

    .success-message {
      margin-top: 1rem;
      text-align: center;
      padding: 0.75rem;
      background-color: #e8f8f0;
      border-radius: 0.375rem;
      border: 1px solid #a8e6c9;
      color: #23b26d;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .auth-footer {
      margin-top: 1.25rem;
      text-align: center;
      color: #586380;
      font-size: 0.8125rem;
    }

    .auth-footer a {
      color: #4255ff;
      font-weight: 500;
      text-decoration: none;
      margin-left: 0.25rem;
      transition: all 0.2s;
    }

    .auth-footer a:hover {
      text-decoration: underline;
      color: #3b4ce3;
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
  public resetPassword: OutputEmitterRef<{email: string}> = output<{email: string}>();

  private readonly fb: FormBuilder = inject(FormBuilder);

  public resetForm!: FormGroup;
  public submitted: boolean = false;
  public loading: boolean = false;
  public error: string = '';
  public success: string = '';

  public ngOnInit(): void {
    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  public get f() {
    return this.resetForm.controls;
  }

  public onSubmit(): void {
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
