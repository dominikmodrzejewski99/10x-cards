import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, WritableSignal, Signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { SupabaseClientFactory } from '../../services/supabase-client.factory';
import { AuthStore } from '../store';

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        @if (readySignal()) {
          <div class="auth-header">
            <h1 class="auth-title">Nowe hasło</h1>
            <p class="auth-desc">Wprowadź swoje nowe hasło poniżej.</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="auth-field">
              <label for="password" class="auth-label">Nowe hasło</label>
              <input
                type="password"
                id="password"
                class="auth-input"
                formControlName="password"
                placeholder="Minimum 6 znaków"
                autocomplete="new-password"
              />
              @if ((submittedSignal() || form.controls['password'].touched) && form.controls['password'].errors) {
                <div class="auth-error">
                  @if (form.controls['password'].errors['required']) {
                    <span>Hasło jest wymagane</span>
                  }
                  @if (form.controls['password'].errors['minlength']) {
                    <span>Hasło musi mieć co najmniej 6 znaków</span>
                  }
                </div>
              }
            </div>

            <div class="auth-field">
              <label for="confirmPassword" class="auth-label">Potwierdź hasło</label>
              <input
                type="password"
                id="confirmPassword"
                class="auth-input"
                formControlName="confirmPassword"
                placeholder="Powtórz nowe hasło"
                autocomplete="new-password"
              />
              @if ((submittedSignal() || form.controls['confirmPassword'].touched) && mismatchSignal()) {
                <div class="auth-error">
                  <span>Hasła nie są zgodne</span>
                </div>
              }
            </div>

            <button
              type="submit"
              class="auth-submit"
              [disabled]="loadingSignal()">
              Ustaw nowe hasło
              @if (loadingSignal()) { <span>...</span> }
            </button>

            @if (errorSignal()) {
              <div class="auth-error auth-error--global">
                {{ errorSignal() }}
              </div>
            }
          </form>

          <div class="auth-footer">
            <a routerLink="/login" class="auth-back-link">
              <i class="pi pi-arrow-left"></i> Wróć do logowania
            </a>
          </div>
        } @else if (expiredSignal()) {
          <div class="auth-header">
            <h1 class="auth-title">Link wygasł</h1>
            <p class="auth-desc">Link do resetowania hasła wygasł lub jest nieprawidłowy. Spróbuj ponownie.</p>
          </div>
          <div class="auth-footer">
            <a routerLink="/forgot-password" class="auth-back-link">
              Wyślij nowy link
            </a>
          </div>
        } @else {
          <div class="auth-header">
            <h1 class="auth-title">Weryfikacja...</h1>
            <p class="auth-desc">Trwa weryfikacja linku resetującego.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      background-color: #f6f7fb;
      padding: 4rem 1rem 1rem;
    }
    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 2rem;
      border-radius: 0.75rem;
      border: 1px solid #d9dbe9;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      background-color: #ffffff;
    }
    .auth-header { margin-bottom: 1.5rem; }
    .auth-title {
      text-align: center;
      color: #282e3e;
      font-size: 1.5rem;
      font-weight: 800;
      margin: 0 0 0.5rem;
    }
    .auth-desc {
      text-align: center;
      color: #586380;
      font-size: 0.9rem;
      margin: 0;
      line-height: 1.5;
    }
    form { display: flex; flex-direction: column; gap: 1rem; }
    .auth-field { display: flex; flex-direction: column; gap: 0.375rem; }
    .auth-label { font-size: 0.875rem; font-weight: 600; color: #282e3e; }
    .auth-input {
      padding: 0.75rem 1rem;
      border: 1.5px solid #d9dbe9;
      border-radius: 0.5rem;
      font-size: 1rem;
      color: #282e3e;
      transition: all 0.15s;
      background: #fff;
      width: 100%;
      box-sizing: border-box;
    }
    .auth-input:focus {
      outline: none;
      border-color: #4255ff;
      box-shadow: 0 0 0 3px rgba(66, 85, 255, 0.12);
    }
    .auth-submit {
      padding: 0.875rem;
      background: #4255ff;
      color: #fff;
      border: none;
      border-radius: 0.5rem;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.15s;
      width: 100%;
    }
    .auth-submit:hover { background: #3b4ce3; }
    .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    .auth-error { color: #ff6240; font-size: 0.8125rem; font-weight: 500; }
    .auth-error--global {
      text-align: center;
      padding: 0.75rem;
      background: #fff0ed;
      border-radius: 0.5rem;
      border: 1px solid #ffcfc5;
      font-size: 0.875rem;
    }
    .auth-footer { margin-top: 1.25rem; text-align: center; }
    .auth-back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: #4255ff;
      font-weight: 600;
      font-size: 0.875rem;
      text-decoration: none;
      transition: gap 0.15s;
    }
    .auth-back-link:hover { gap: 0.5rem; }
  `]
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authStore = inject(AuthStore);
  private supabaseFactory = inject(SupabaseClientFactory);
  private authListenerCleanup: { data: { subscription: { unsubscribe: () => void } } } | null = null;

  public loadingSignal: Signal<boolean> = this.authStore.loading;
  public errorSignal: Signal<string | null> = this.authStore.error;
  public submittedSignal: WritableSignal<boolean> = signal(false);
  public mismatchSignal: WritableSignal<boolean> = signal(false);
  public readySignal: WritableSignal<boolean> = signal(false);
  public expiredSignal: WritableSignal<boolean> = signal(false);

  public form: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  });

  private formSub: Subscription = this.form.valueChanges.subscribe(() => {
    const { password, confirmPassword } = this.form.value;
    if (this.form.controls['confirmPassword'].touched && confirmPassword) {
      this.mismatchSignal.set(password !== confirmPassword);
    }
  });

  ngOnInit(): void {
    const supabase = this.supabaseFactory.getClient();

    // Listen for PASSWORD_RECOVERY event from Supabase
    this.authListenerCleanup = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        this.readySignal.set(true);
      }
    });

    // Timeout — if no recovery event after 5s, link is expired/invalid
    setTimeout(() => {
      if (!this.readySignal()) {
        // Check if maybe we already have a session (user navigated directly)
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            this.readySignal.set(true);
          } else {
            this.expiredSignal.set(true);
          }
        });
      }
    }, 5000);
  }

  ngOnDestroy(): void {
    this.authListenerCleanup?.data.subscription.unsubscribe();
    this.formSub.unsubscribe();
  }

  public onSubmit(): void {
    this.submittedSignal.set(true);
    this.authStore.clearError();

    const { password, confirmPassword } = this.form.value;
    this.mismatchSignal.set(password !== confirmPassword);

    if (this.form.invalid || password !== confirmPassword) return;

    this.authStore.updatePassword(password);
  }
}
