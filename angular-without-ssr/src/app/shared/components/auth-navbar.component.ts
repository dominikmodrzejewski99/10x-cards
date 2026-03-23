import { Component, ChangeDetectionStrategy, inject, signal, WritableSignal, Signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UserMenuComponent } from '../../auth/components/user-menu.component';
import { AuthStore } from '../../auth/store';

@Component({
  selector: 'app-auth-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, UserMenuComponent],
  host: {
    '(document:keydown.escape)': 'onEscape()'
  },
  template: `
    <nav class="navbar">
      <div class="navbar__inner">
        <a routerLink="/" class="navbar__logo">
          <svg class="navbar__logo-svg" width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="56" height="56" rx="14" fill="#4255ff"/>
            <rect x="12" y="18" width="24" height="30" rx="4" fill="#fff" opacity="0.2" transform="rotate(-6 12 18)"/>
            <rect x="20" y="14" width="24" height="30" rx="4" fill="#fff" opacity="0.2"/>
            <rect x="28" y="10" width="24" height="30" rx="4" fill="#fff"/>
            <path d="M34 20 L46 20" stroke="#4255ff" stroke-width="2" stroke-linecap="round"/>
            <path d="M34 26 L42 26" stroke="#4255ff" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
            <circle cx="48" cy="36" r="7" fill="#4255ff"/>
            <circle cx="48" cy="36" r="6" fill="#fff"/>
            <path d="M45.5 36 L47 37.5 L50.5 34" stroke="#4255ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="navbar__logo-text">mem<span class="navbar__logo-accent">lo</span></span>
        </a>

        <!-- Desktop links (authenticated) -->
        <div class="navbar__links navbar__links--desktop">
          @if (authCheckedSignal() && isAuthenticatedSignal()) {
            <a routerLink="/dashboard" routerLinkActive="navbar__link--active" class="navbar__link">
              <i class="pi pi-home"></i> Start
            </a>
            <a routerLink="/generate" routerLinkActive="navbar__link--active" class="navbar__link">
              <i class="pi pi-sparkles"></i> Generuj
            </a>
            <a routerLink="/sets" routerLinkActive="navbar__link--active" class="navbar__link">
              <i class="pi pi-folder"></i> Zestawy
            </a>
            <a routerLink="/study" routerLinkActive="navbar__link--active" class="navbar__link">
              <i class="pi pi-book"></i> Nauka
            </a>
            <a routerLink="/learning-guide" routerLinkActive="navbar__link--active" class="navbar__link">
              <i class="pi pi-lightbulb"></i> Poradnik
            </a>
            <a routerLink="/language-test" routerLinkActive="navbar__link--active" class="navbar__link">
              <i class="pi pi-check-square"></i> Testy
            </a>
            <a routerLink="/quiz" routerLinkActive="navbar__link--active" class="navbar__link">
              <i class="pi pi-file-edit"></i> Quiz
            </a>
          }
        </div>

        <div class="navbar__right">
          @if (authCheckedSignal() && isAuthenticatedSignal()) {
            <app-user-menu></app-user-menu>
            <button class="navbar__burger" (click)="toggleMobile()" [attr.aria-expanded]="mobileOpenSignal()">
              <span class="navbar__burger-line"></span>
              <span class="navbar__burger-line"></span>
              <span class="navbar__burger-line"></span>
            </button>
          } @else {
            <a routerLink="/login" class="navbar__auth-btn navbar__auth-btn--login">Zaloguj się</a>
            <a routerLink="/register" class="navbar__auth-btn navbar__auth-btn--register">Zarejestruj się</a>
          }
        </div>
      </div>

      <!-- Mobile drawer -->
      @if (authCheckedSignal() && isAuthenticatedSignal() && mobileOpenSignal()) {
        <div class="navbar__drawer">
          <a routerLink="/dashboard" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
            <i class="pi pi-home"></i> Start
          </a>
          <a routerLink="/generate" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
            <i class="pi pi-sparkles"></i> Generuj
          </a>
          <a routerLink="/sets" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
            <i class="pi pi-folder"></i> Zestawy
          </a>
          <a routerLink="/study" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
            <i class="pi pi-book"></i> Nauka
          </a>
          <a routerLink="/learning-guide" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
            <i class="pi pi-lightbulb"></i> Poradnik
          </a>
          <a routerLink="/language-test" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
            <i class="pi pi-check-square"></i> Testy
          </a>
          <a routerLink="/quiz" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
            <i class="pi pi-file-edit"></i> Quiz
          </a>
        </div>
      }
    </nav>
  `,
  styleUrl: './auth-navbar.component.scss'
})
export class AuthNavbarComponent {
  private authStore = inject(AuthStore);

  public authCheckedSignal: Signal<boolean> = this.authStore.authChecked;
  public isAuthenticatedSignal: Signal<boolean> = this.authStore.isAuthenticated;
  public isAnonymousSignal: Signal<boolean> = this.authStore.isAnonymous;
  public mobileOpenSignal: WritableSignal<boolean> = signal<boolean>(false);

  public toggleMobile(): void {
    this.mobileOpenSignal.update((v: boolean) => !v);
  }

  public closeMobile(): void {
    this.mobileOpenSignal.set(false);
  }

  public onEscape(): void {
    this.closeMobile();
  }
}
