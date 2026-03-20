import { Component, ChangeDetectionStrategy, inject, signal, effect, WritableSignal, Signal } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { AuthFormComponent } from './auth-form.component';

@Component({
  selector: 'app-auth-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, AuthFormComponent],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1 class="auth-title">{{ isLoginModeSignal() ? 'Logowanie' : 'Rejestracja' }}</h1>
          <div class="auth-tabs">
            <a
              routerLink="/login"
              class="auth-tabs__link"
              [class.auth-tabs__link--active]="isLoginModeSignal()"
              (click)="setLoginMode(true)">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Logowanie
            </a>
            <a
              routerLink="/register"
              class="auth-tabs__link"
              [class.auth-tabs__link--active]="!isLoginModeSignal()"
              (click)="setLoginMode(false)">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              Rejestracja
            </a>
          </div>
        </div>

        <app-auth-form
          [isLoginMode]="isLoginModeSignal()"
          (modeChange)="setLoginMode($event)">
        </app-auth-form>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      background-color: #f6f7fb;
      padding: 4rem 1rem 1rem 1rem;
    }

    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 1.5rem 1.5rem 1rem 1.5rem;
      border-radius: 0.75rem;
      border: 1px solid #d9dbe9;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      background-color: #ffffff;
    }

    .auth-header {
      margin-bottom: 1.5rem;
    }

    .auth-title {
      text-align: center;
      color: #282e3e;
      font-size: 1.5rem;
      font-weight: 800;
      margin-bottom: 1.25rem;
    }

    .auth-tabs {
      display: flex;
      border-bottom: 1px solid #d9dbe9;
      margin-bottom: 1.5rem;
      justify-content: center;
      gap: 1rem;
    }

    .auth-tabs__link {
      padding: 0.5rem 0.75rem;
      background: none;
      border: none;
      color: #586380;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      text-decoration: none;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .auth-tabs__link .icon {
      width: 16px;
      height: 16px;
      stroke-width: 2;
    }

    .auth-tabs__link:hover {
      color: #4255ff;
    }

    .auth-tabs__link--active {
      color: #4255ff;
      font-weight: 600;
    }

    .auth-tabs__link--active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      width: 100%;
      height: 2px;
      background-color: #4255ff;
      transition: all 0.2s;
    }

    @media (min-width: 480px) {
      .auth-card {
        padding: 2rem 2rem 1.5rem 2rem;
      }

      .auth-title {
        font-size: 1.75rem;
        margin-bottom: 1.5rem;
      }

      .auth-tabs {
        gap: 2rem;
      }

      .auth-tabs__link {
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
      }

      .auth-tabs__link .icon {
        width: 18px;
        height: 18px;
      }
    }
  `]
})
export class AuthPageComponent {
  private router: Router = inject(Router);
  private route: ActivatedRoute = inject(ActivatedRoute);

  public isLoginModeSignal: WritableSignal<boolean> = signal<boolean>(this.router.url.includes('/login'));

  private routePathSignal: Signal<string> = toSignal(
    this.route.url.pipe(
      map((segments) => segments.map((s) => s.path).join('/'))
    ),
    { initialValue: '' }
  );

  constructor() {
    effect(() => {
      const path: string = this.routePathSignal();
      if (path) {
        this.isLoginModeSignal.set(path === 'login');
      }
    });
  }

  public setLoginMode(isLogin: boolean): void {
    this.isLoginModeSignal.set(isLogin);
    const targetPath: string = isLogin ? '/login' : '/register';
    this.router.navigate([targetPath]);
  }
}
