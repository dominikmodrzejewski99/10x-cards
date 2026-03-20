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
          <span class="navbar__logo-icon">10x</span>
          <span class="navbar__logo-text">Cards</span>
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
