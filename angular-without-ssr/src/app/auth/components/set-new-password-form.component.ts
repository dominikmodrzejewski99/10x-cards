import { ChangeDetectionStrategy, Component, inject, OnInit, output, OutputEmitterRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-set-new-password-form',
  imports: [ReactiveFormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="passwordForm" (ngSubmit)="onSubmit()">
      <div class="form-field">
        <label for="password">Nowe hasło</label>
        <input
          type="password"
          id="password"
          formControlName="password"
          placeholder="Minimum 6 znaków"
        />
        @if (submitted && f['password'].errors) {
          <div class="error-message">
            @if (f['password'].errors['required']) {
              <span>Hasło jest wymagane</span>
            }
            @if (f['password'].errors['minlength']) {
              <span>Hasło musi mieć co najmniej 6 znaków</span>
            }
          </div>
        }
      </div>

      <div class="form-field">
        <label for="passwordConfirmation">Potwierdź hasło</label>
        <input
          type="password"
          id="passwordConfirmation"
          formControlName="passwordConfirmation"
          placeholder="Powtórz hasło"
        />
        @if (submitted && f['passwordConfirmation'].errors) {
          <div class="error-message">
            @if (f['passwordConfirmation'].errors['required']) {
              <span>Potwierdzenie hasła jest wymagane</span>
            }
            @if (f['passwordConfirmation'].errors['mustMatch']) {
              <span>Hasła muszą być identyczne</span>
            }
          </div>
        }
      </div>

      <button
        type="submit"
        class="submit-button"
        [disabled]="loading">
        Ustaw nowe hasło
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
export class SetNewPasswordFormComponent implements OnInit {
  public setNewPassword: OutputEmitterRef<{password: string; token: string}> = output<{password: string; token: string}>();

  private readonly fb: FormBuilder = inject(FormBuilder);

  public passwordForm!: FormGroup;
  public submitted: boolean = false;
  public loading: boolean = false;
  public error: string = '';
  public success: string = '';
  public token: string = '';

  public ngOnInit(): void {
    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      passwordConfirmation: ['', [Validators.required]]
    }, {
      validator: this.mustMatch('password', 'passwordConfirmation')
    });

    this.token = 'sample-token';
  }

  public get f() {
    return this.passwordForm.controls;
  }

  private mustMatch(controlName: string, matchingControlName: string) {
    return (formGroup: FormGroup) => {
      const control = formGroup.controls[controlName];
      const matchingControl = formGroup.controls[matchingControlName];

      if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
        return;
      }

      if (control.value !== matchingControl.value) {
        matchingControl.setErrors({ mustMatch: true });
      } else {
        matchingControl.setErrors(null);
      }
    };
  }

  public onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.success = '';

    if (this.passwordForm.invalid) {
      return;
    }

    this.loading = true;

    const { password } = this.passwordForm.value;

    this.setNewPassword.emit({ password, token: this.token });

    setTimeout(() => {
      this.loading = false;
      this.success = 'Hasło zostało pomyślnie zmienione. Za chwilę zostaniesz przekierowany do strony logowania.';
      this.passwordForm.reset();
      this.submitted = false;
    }, 1500);
  }
}
