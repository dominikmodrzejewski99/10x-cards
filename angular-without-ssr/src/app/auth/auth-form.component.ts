import { Component, EventEmitter, Input, OnInit, OnDestroy, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { LoginUserCommand, RegisterUserCommand } from '../../types';
import * as AuthActions from './store/auth.actions';
import { selectAuthError, selectAuthLoading } from './store/auth.selectors';

@Component({
  selector: 'app-auth-form',
  imports: [ReactiveFormsModule, RouterModule],
  template: `
    <form [formGroup]="authForm" (ngSubmit)="onSubmit()">
      <div class="form-field">
        <label for="email">Email</label>
        <input
          type="email"
          id="email"
          formControlName="email"
          placeholder="Wprowadź swój adres email"
          data-testid="login-email-input"
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

      <div class="form-field">
        <label for="password">Hasło</label>
        <input
          type="password"
          id="password"
          formControlName="password"
          placeholder="Minimum 6 znaków"
          data-testid="login-password-input"
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

      <button
        type="submit"
        class="submit-button"
        [disabled]="loading"
        data-testid="login-submit-button">
        {{ isLoginMode ? 'Zaloguj się' : 'Zarejestruj się' }}
        @if (loading) { <span>...</span> }
      </button>

      @if (error) {
        <div class="error-message global-error">
          {{ error }}
        </div>
      }

      <div class="auth-divider">
        <span>lub</span>
      </div>

      <button
        type="button"
        class="anon-button"
        [disabled]="loading"
        (click)="onAnonymousLogin()"
        data-testid="anonymous-login-button">
        <i class="pi pi-user"></i>
        Wypróbuj bez rejestracji
      </button>

      <div class="auth-footer">
        <p>
          {{ isLoginMode ? 'Nie masz jeszcze konta?' : 'Masz już konto?' }}
          <a
            [routerLink]="isLoginMode ? '/register' : '/login'"
            (click)="toggleAuthMode()">
            {{ isLoginMode ? 'Zarejestruj się' : 'Zaloguj się' }}
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
      font-weight: 600;
      color: #282e3e;
    }

    input {
      padding: 0.75rem 0.875rem;
      border: 1.5px solid #d9dbe9;
      border-radius: 0.5rem;
      font-size: 0.9375rem;
      color: #282e3e;
      transition: all 0.15s;
      background-color: #ffffff;
      width: 100%;
      box-sizing: border-box;
    }

    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
      -webkit-text-fill-color: #282e3e !important;
      background-color: #ffffff !important;
    }

    input::placeholder {
      color: #b0b5c4;
      font-size: 0.875rem;
    }

    input:focus {
      outline: none;
      border-color: #4255ff;
      box-shadow: 0 0 0 3px rgba(66, 85, 255, 0.12);
      color: #282e3e !important;
    }

    .submit-button {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background-color: #4255ff;
      color: #ffffff;
      border: none;
      border-radius: 0.5rem;
      font-weight: 700;
      font-size: 0.9375rem;
      cursor: pointer;
      transition: background-color 0.15s;
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
      border-radius: 0.5rem;
      border: 1px solid #ffcfc5;
      font-size: 0.875rem;
      color: #ff6240;
    }

    .auth-footer {
      margin-top: 0.75rem;
      text-align: center;
      color: #586380;
      font-size: 0.8125rem;
    }

    .auth-footer a {
      color: #4255ff;
      font-weight: 600;
      text-decoration: none;
      margin-left: 0.25rem;
      transition: all 0.15s;
    }

    .auth-footer a:hover {
      text-decoration: underline;
      color: #3b4ce3;
    }

    .auth-divider {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0.25rem 0;
    }

    .auth-divider::before,
    .auth-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #d9dbe9;
    }

    .auth-divider span {
      font-size: 0.75rem;
      color: #b0b5c4;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .anon-button {
      width: 100%;
      padding: 0.75rem;
      background: #ffffff;
      color: #586380;
      border: 1.5px solid #d9dbe9;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.9375rem;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-family: inherit;
    }

    .anon-button:hover {
      background: #f6f7fb;
      border-color: #4255ff;
      color: #4255ff;
    }

    .anon-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .anon-button i {
      font-size: 0.875rem;
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
        margin-top: 1rem;
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
export class AuthFormComponent implements OnInit, OnDestroy {
  @Input() isLoginMode = true;
  @Output() modeChange = new EventEmitter<boolean>();

  authForm!: FormGroup;
  submitted = false;
  loading = false;
  error = '';

  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.subscriptions.add(
      this.store.select(selectAuthLoading).subscribe(loading => {
        this.loading = loading;
      })
    );

    this.subscriptions.add(
      this.store.select(selectAuthError).subscribe(error => {
        this.error = error || '';
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get f() {
    return this.authForm.controls;
  }

  toggleAuthMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.modeChange.emit(this.isLoginMode);
    this.submitted = false;
    this.error = '';
    this.authForm.reset();

    const targetPath = this.isLoginMode ? '/login' : '/register';
    this.router.navigate([targetPath]);
  }

  onSubmit(): void {
    this.submitted = true;
    this.store.dispatch(AuthActions.clearAuthError());

    if (this.authForm.invalid) {
      return;
    }

    const { email, password } = this.authForm.value;

    if (this.isLoginMode) {
      this.store.dispatch(AuthActions.login({ email, password }));
    } else {
      this.store.dispatch(AuthActions.register({
        email,
        password,
        passwordConfirmation: password
      }));
    }
  }

  onAnonymousLogin(): void {
    this.store.dispatch(AuthActions.clearAuthError());
    this.store.dispatch(AuthActions.loginAnonymously());
  }
}
