import { Component } from '@angular/core';

import { RouterModule } from '@angular/router';
import { PasswordResetFormComponent } from '../components/password-reset-form.component';

@Component({
  selector: 'app-password-reset-page',
  standalone: true,
  imports: [RouterModule, PasswordResetFormComponent],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1 class="auth-title">Resetowanie hasła</h1>
          <p class="auth-subtitle">
            Wprowadź adres email powiązany z Twoim kontem, a my wyślemy Ci link do resetowania hasła.
          </p>
        </div>

        <app-password-reset-form
          (resetPassword)="onResetPassword($event)">
        </app-password-reset-form>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f6f7fb;
      padding: 1rem;
    }

    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 1.5rem;
      border-radius: 0.75rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      background-color: #ffffff;
    }

    .auth-header {
      margin-bottom: 1.5rem;
    }

    .auth-title {
      text-align: center;
      color: #282e3e;
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
    }

    .auth-subtitle {
      text-align: center;
      color: #586380;
      font-size: 0.8125rem;
      line-height: 1.5;
    }

    @media (min-width: 480px) {
      .auth-card {
        padding: 2rem;
      }

      .auth-header {
        margin-bottom: 2rem;
      }

      .auth-title {
        font-size: 1.75rem;
        margin-bottom: 1rem;
      }

      .auth-subtitle {
        font-size: 0.875rem;
      }
    }
  `]
})
export class PasswordResetPageComponent {

}
