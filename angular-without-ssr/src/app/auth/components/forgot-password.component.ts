import { Component, ChangeDetectionStrategy, inject, signal, WritableSignal, Signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthStore } from '../store';

@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1 class="auth-title">Resetuj hasło</h1>
          <p class="auth-desc">Podaj swój adres email, a wyślemy Ci link do zresetowania hasła.</p>
        </div>

        @if (sentSignal()) {
          <div class="auth-success">
            <i class="pi pi-check-circle"></i>
            <p>Link do resetowania hasła został wysłany na <strong>{{ sentEmailSignal() }}</strong>.</p>
            <p class="auth-success__hint">Sprawdź skrzynkę (i folder spam).</p>
          </div>
          <div class="auth-footer">
            <a routerLink="/login" class="auth-back-link">
              <i class="pi pi-arrow-left"></i> Wróć do logowania
            </a>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="auth-field">
              <label for="email" class="auth-label">Email</label>
              <input
                type="email"
                id="email"
                class="auth-input"
                formControlName="email"
                placeholder="Wprowadź swój adres email"
              />
              @if ((submittedSignal() || form.controls['email'].touched) && form.controls['email'].errors) {
                <div class="auth-error">
                  @if (form.controls['email'].errors['required']) {
                    <span>Email jest wymagany</span>
                  }
                  @if (form.controls['email'].errors['email']) {
                    <span>Niepoprawny format email</span>
                  }
                </div>
              }
            </div>

            <button
              type="submit"
              class="auth-submit"
              [disabled]="loadingSignal()">
              Wyślij link resetujący
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
    .auth-success {
      text-align: center;
      padding: 1.5rem;
      background: #ecfdf5;
      border-radius: 0.75rem;
      border: 1px solid #d1fae5;
      color: #166534;
      margin-bottom: 1rem;
    }
    .auth-success i { font-size: 2rem; color: #23b26d; margin-bottom: 0.75rem; }
    .auth-success p { margin: 0.25rem 0; font-size: 0.9rem; }
    .auth-success__hint { font-size: 0.8rem; color: #586380; margin-top: 0.5rem; }
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
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authStore = inject(AuthStore);

  public loadingSignal: Signal<boolean> = this.authStore.loading;
  public errorSignal: Signal<string | null> = this.authStore.error;
  public submittedSignal: WritableSignal<boolean> = signal(false);
  public sentSignal: WritableSignal<boolean> = signal(false);
  public sentEmailSignal: WritableSignal<string> = signal('');

  public form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  public onSubmit(): void {
    this.submittedSignal.set(true);
    this.authStore.clearError();

    if (this.form.invalid) return;

    const email = this.form.value.email;
    this.sentEmailSignal.set(email);
    this.authStore.resetPassword(email);

    // Show success after a short delay (optimistic — Supabase doesn't reveal if email exists)
    setTimeout(() => {
      if (!this.errorSignal()) {
        this.sentSignal.set(true);
      }
    }, 1500);
  }
}
