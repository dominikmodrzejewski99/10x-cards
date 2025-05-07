import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SetNewPasswordFormComponent } from '../components/set-new-password-form.component';

@Component({
  selector: 'app-set-new-password-page',
  standalone: true,
  imports: [CommonModule, RouterModule, SetNewPasswordFormComponent],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1 class="auth-title">Ustaw nowe hasło</h1>
          <p class="auth-subtitle">
            Wprowadź nowe hasło dla swojego konta. Hasło musi mieć co najmniej 6 znaków.
          </p>
        </div>

        <app-set-new-password-form
          (setNewPassword)="onSetNewPassword($event)">
        </app-set-new-password-form>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f9fafb;
    }

    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 2rem;
      border-radius: 0.75rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      background-color: white;
    }

    .auth-header {
      margin-bottom: 2rem;
    }

    .auth-title {
      text-align: center;
      color: #1f2937;
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }

    .auth-subtitle {
      text-align: center;
      color: #6b7280;
      font-size: 0.875rem;
      line-height: 1.5;
    }
  `]
})
export class SetNewPasswordPageComponent implements OnInit {
  token: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // W rzeczywistej implementacji pobieralibyśmy token z parametrów URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || null;
      
      if (!this.token) {
        console.error('Brak tokenu w URL');
        // W rzeczywistej implementacji przekierowalibyśmy do strony błędu lub resetowania hasła
      }
    });
  }

  onSetNewPassword(data: {password: string, token: string}): void {
    console.log('Set new password with token:', data.token);
    // W rzeczywistej implementacji wywołalibyśmy tutaj serwis AuthService
    
    // Symulacja przekierowania po pomyślnej zmianie hasła
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 2000);
  }
}
