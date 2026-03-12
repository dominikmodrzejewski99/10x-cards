import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal, WritableSignal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { UserMenuComponent } from '../../auth/components/user-menu.component';
import { selectIsAuthenticated, selectIsAnonymous } from '../../auth/store/auth.selectors';

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
          @if (isAuthenticated) {
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
          }
        </div>

        <div class="navbar__right">
          @if (isAuthenticated && !isAnonymous) {
            <app-user-menu></app-user-menu>
          } @else {
            <a routerLink="/login" class="navbar__auth-btn navbar__auth-btn--login">Zaloguj się</a>
            <a routerLink="/register" class="navbar__auth-btn navbar__auth-btn--register">Zarejestruj się</a>
          }

          @if (isAuthenticated) {
            <button class="navbar__burger" (click)="toggleMobile()" [attr.aria-expanded]="mobileOpenSignal()">
              <span class="navbar__burger-line"></span>
              <span class="navbar__burger-line"></span>
              <span class="navbar__burger-line"></span>
            </button>
          }
        </div>
      </div>

      <!-- Mobile drawer -->
      @if (isAuthenticated && mobileOpenSignal()) {
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
        </div>
      }
    </nav>
  `,
  styleUrl: './auth-navbar.component.scss'
})
export class AuthNavbarComponent implements OnInit, OnDestroy {
  public isAuthenticated: boolean = false;
  public isAnonymous: boolean = false;
  public mobileOpenSignal: WritableSignal<boolean> = signal<boolean>(false);

  private store: Store = inject(Store);
  private subscription: Subscription = new Subscription();

  public toggleMobile(): void {
    this.mobileOpenSignal.update((v: boolean) => !v);
  }

  public closeMobile(): void {
    this.mobileOpenSignal.set(false);
  }

  public onEscape(): void {
    this.closeMobile();
  }

  public ngOnInit(): void {
    this.subscription.add(
      this.store.select(selectIsAuthenticated).subscribe((isAuthenticated: boolean) => {
        this.isAuthenticated = isAuthenticated;
      })
    );

    this.subscription.add(
      this.store.select(selectIsAnonymous).subscribe((isAnonymous: boolean) => {
        this.isAnonymous = isAnonymous;
      })
    );
  }

  public ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
