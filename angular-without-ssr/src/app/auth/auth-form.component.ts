import { Component, EventEmitter, Input, OnInit, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { LoginUserCommand, RegisterUserCommand } from '../../types';
import * as AuthActions from './store/auth.actions';
import { selectAuthError, selectAuthLoading } from './store/auth.selectors';

@Component({
  selector: 'app-auth-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
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
        <div *ngIf="submitted && f['email'].errors" class="error-message">
          <span *ngIf="f['email'].errors['required']">Email jest wymagany</span>
          <span *ngIf="f['email'].errors['email']">Niepoprawny format email</span>
        </div>
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
        <div *ngIf="submitted && f['password'].errors" class="error-message">
          <span *ngIf="f['password'].errors['required']">Hasło jest wymagane</span>
          <span *ngIf="f['password'].errors['minlength']">Hasło musi mieć co najmniej 6 znaków</span>
        </div>
      </div>

      <button
        type="submit"
        class="submit-button"
        [disabled]="loading"
        data-testid="login-submit-button">
        {{ isLoginMode ? 'Zaloguj się' : 'Zarejestruj się' }}
        <span *ngIf="loading">...</span>
      </button>

      <div *ngIf="error" class="error-message global-error">
        {{ error }}
      </div>

      <div class="auth-footer">
        <p>
          {{ isLoginMode ? 'Nie masz jeszcze konta?' : 'Masz już konto?' }}
          <a
            [routerLink]="isLoginMode ? '/register' : '/login'"
            (click)="toggleAuthMode()">
            {{ isLoginMode ? 'Zarejestruj się' : 'Zaloguj się' }}
          </a>
        </p>
        <p *ngIf="isLoginMode" class="forgot-password">
          <a routerLink="/reset-password">Zapomniałeś hasła?</a>
        </p>
      </div>
    </form>
  `,
  styles: [`
    form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }

    input {
      padding: 0.75rem 1rem;
      border: 1px solid #d1d5db;
      border-radius: 0.5rem;
      font-size: 1rem;
      color: #1f2937;
      transition: all 0.2s;
      background-color: #ffffff;
    }

    input::placeholder {
      color: #9ca3af;
    }

    input:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
    }

    .submit-button {
      margin-top: 0.75rem;
      padding: 0.875rem;
      background-color: #2563eb;
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: background-color 0.2s;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
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
      font-size: 0.875rem;
      font-weight: 500;
    }

    .global-error {
      margin-top: 1rem;
      text-align: center;
      padding: 0.75rem;
      background-color: #fee2e2;
      border-radius: 0.375rem;
      border: 1px solid #fecaca;
    }

    .auth-footer {
      margin-top: 1.5rem;
      text-align: center;
      color: #4b5563;
      font-size: 0.875rem;
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

    .forgot-password {
      margin-top: 0.75rem;
      font-size: 0.8125rem;
    }

    .forgot-password a {
      color: #6b7280;
      margin-left: 0;
    }

    .forgot-password a:hover {
      color: #4b5563;
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

    // Subskrybuj stan ładowania i błędów z NgRx store
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

    // Zaktualizuj URL, aby odzwierciedlał aktualny tryb
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
        passwordConfirmation: password // W tym przypadku nie mamy osobnego pola na potwierdzenie hasła
      }));
    }
  }
}
