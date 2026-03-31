import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, WritableSignal, Signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import { SupabaseClientFactory } from '../../services/supabase-client.factory';
import { AuthStore } from '../store';

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterModule, TranslocoDirective],
  template: `
    <ng-container *transloco="let t; prefix: 'auth.resetPassword'">
      <div class="auth-container">
        <div class="auth-card">
          @if (readySignal()) {
            <div class="auth-header">
              <h1 class="auth-title">{{ t('title') }}</h1>
              <p class="auth-desc">{{ t('description') }}</p>
            </div>

            <form [formGroup]="form" (ngSubmit)="onSubmit()">
              <div class="auth-field">
                <label for="password" class="auth-label">{{ t('newPassword') }}</label>
                <div class="auth-input-wrap">
                  <input
                    [type]="showPasswordSignal() ? 'text' : 'password'"
                    id="password"
                    class="auth-input auth-input--password"
                    formControlName="password"
                    [placeholder]="t('passwordPlaceholder')"
                    autocomplete="new-password"
                  />
                  <button
                    type="button"
                    class="auth-toggle-password"
                    (click)="showPasswordSignal.set(!showPasswordSignal())"
                    [attr.aria-label]="showPasswordSignal() ? t('hidePassword') : t('showPassword')"
                    tabindex="-1">
                    <i [class]="showPasswordSignal() ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
                  </button>
                </div>
                @if ((submittedSignal() || form.controls['password'].touched) && form.controls['password'].errors) {
                  <div class="auth-error">
                    @if (form.controls['password'].errors['required']) {
                      <span>{{ t('passwordRequired') }}</span>
                    }
                    @if (form.controls['password'].errors['minlength']) {
                      <span>{{ t('passwordMinLength') }}</span>
                    }
                  </div>
                }
              </div>

              <div class="auth-field">
                <label for="confirmPassword" class="auth-label">{{ t('confirmPassword') }}</label>
                <div class="auth-input-wrap">
                  <input
                    [type]="showConfirmPasswordSignal() ? 'text' : 'password'"
                    id="confirmPassword"
                    class="auth-input auth-input--password"
                    formControlName="confirmPassword"
                    [placeholder]="t('confirmPasswordPlaceholder')"
                    autocomplete="new-password"
                  />
                  <button
                    type="button"
                    class="auth-toggle-password"
                    (click)="showConfirmPasswordSignal.set(!showConfirmPasswordSignal())"
                    [attr.aria-label]="showConfirmPasswordSignal() ? t('hidePassword') : t('showPassword')"
                    tabindex="-1">
                    <i [class]="showConfirmPasswordSignal() ? 'pi pi-eye-slash' : 'pi pi-eye'"></i>
                  </button>
                </div>
                @if ((submittedSignal() || form.controls['confirmPassword'].touched) && mismatchSignal()) {
                  <div class="auth-error">
                    <span>{{ t('passwordMismatch') }}</span>
                  </div>
                }
              </div>

              <button
                type="submit"
                class="auth-submit"
                [disabled]="loadingSignal()">
                {{ t('submitButton') }}
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
                <i class="pi pi-arrow-left"></i> {{ t('backToLogin') }}
              </a>
            </div>
          } @else if (expiredSignal()) {
            <div class="auth-header">
              <h1 class="auth-title">{{ t('linkExpired') }}</h1>
              <p class="auth-desc">{{ t('linkExpiredDescription') }}</p>
            </div>
            <div class="auth-footer">
              <a routerLink="/forgot-password" class="auth-back-link">
                {{ t('sendNewLink') }}
              </a>
            </div>
          } @else {
            <div class="auth-header">
              <h1 class="auth-title">{{ t('verifying') }}</h1>
              <p class="auth-desc">{{ t('verifyingDescription') }}</p>
            </div>
          }
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      background-color: var(--app-bg-alt);
      padding: 4rem 1rem 1rem;
    }
    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 2rem;
      border-radius: 0.75rem;
      border: 1px solid var(--app-border);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      background-color: var(--app-white);
    }
    .auth-header { margin-bottom: 1.5rem; }
    .auth-title {
      text-align: center;
      color: var(--app-text);
      font-size: 1.5rem;
      font-weight: 800;
      margin: 0 0 0.5rem;
    }
    .auth-desc {
      text-align: center;
      color: var(--app-text-secondary);
      font-size: 0.9rem;
      margin: 0;
      line-height: 1.5;
    }
    form { display: flex; flex-direction: column; gap: 1rem; }
    .auth-field { display: flex; flex-direction: column; gap: 0.375rem; }
    .auth-label { font-size: 0.875rem; font-weight: 600; color: var(--app-text); }
    .auth-input {
      padding: 0.75rem 1rem;
      border: 1.5px solid var(--app-border);
      border-radius: 0.5rem;
      font-size: 1rem;
      color: var(--app-text);
      transition: all 0.15s;
      background: var(--app-white);
      width: 100%;
      box-sizing: border-box;
    }
    .auth-input:focus {
      outline: none;
      border-color: var(--app-primary);
      box-shadow: 0 0 0 3px var(--app-primary-light);
    }
    .auth-submit {
      padding: 0.875rem;
      background: var(--app-primary);
      color: #fff;
      border: none;
      border-radius: 0.5rem;
      font-weight: 700;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.15s;
      width: 100%;
    }
    .auth-submit:hover { background: var(--app-primary-hover); }
    .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    .auth-error { color: var(--app-error); font-size: 0.8125rem; font-weight: 500; }
    .auth-error--global {
      text-align: center;
      padding: 0.75rem;
      background: var(--app-danger-light);
      border-radius: 0.5rem;
      border: 1px solid var(--app-danger-border);
      font-size: 0.875rem;
    }
    .auth-footer { margin-top: 1.25rem; text-align: center; }
    .auth-back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: var(--app-primary);
      font-weight: 600;
      font-size: 0.875rem;
      text-decoration: none;
      transition: gap 0.15s;
    }
    .auth-back-link:hover { gap: 0.5rem; }
    .auth-input-wrap {
      position: relative;
    }
    .auth-input--password {
      padding-right: 2.75rem;
    }
    .auth-toggle-password {
      position: absolute;
      right: 0.5rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--app-text-secondary);
      cursor: pointer;
      padding: 0.35rem;
      font-size: 0.95rem;
      line-height: 1;
      transition: color 0.15s;
    }
    .auth-toggle-password:hover {
      color: var(--app-primary);
    }
  `]
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authStore = inject(AuthStore);
  private supabaseFactory = inject(SupabaseClientFactory);
  private authListenerCleanup: { data: { subscription: { unsubscribe(): void } } } | null = null;

  public loadingSignal: Signal<boolean> = this.authStore.loading;
  public errorSignal: Signal<string | null> = this.authStore.error;
  public submittedSignal: WritableSignal<boolean> = signal(false);
  public mismatchSignal: WritableSignal<boolean> = signal(false);
  public readySignal: WritableSignal<boolean> = signal(false);
  public expiredSignal: WritableSignal<boolean> = signal(false);
  public showPasswordSignal: WritableSignal<boolean> = signal(false);
  public showConfirmPasswordSignal: WritableSignal<boolean> = signal(false);

  public form: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]]
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
        }).catch(() => {
          this.expiredSignal.set(true);
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
