import { Component, OnInit, OnDestroy, inject, HostListener, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { UserMenuComponent } from '../../auth/components/user-menu.component';
import { selectIsAuthenticated } from '../../auth/store/auth.selectors';

@Component({
  selector: 'app-auth-navbar',
  imports: [RouterModule, UserMenuComponent],
  template: `
    <nav class="navbar">
      <div class="navbar__inner">
        <a routerLink="/" class="navbar__logo">
          <span class="navbar__logo-icon">10x</span>
          <span class="navbar__logo-text">Cards</span>
        </a>

        <!-- Desktop links -->
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
          <app-user-menu></app-user-menu>

          @if (isAuthenticated) {
            <button class="navbar__burger" (click)="toggleMobile()" [attr.aria-expanded]="mobileOpen()">
              <span class="navbar__burger-line"></span>
              <span class="navbar__burger-line"></span>
              <span class="navbar__burger-line"></span>
            </button>
          }
        </div>
      </div>

      <!-- Mobile drawer -->
      @if (isAuthenticated && mobileOpen()) {
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
  styles: [`
    .navbar {
      background: var(--app-white, #ffffff);
      border-bottom: 2px solid var(--app-border, #d9dbe9);
      position: sticky;
      top: 0;
      z-index: 40;
    }

    .navbar__inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.25rem;
      display: flex;
      align-items: center;
      height: 3.5rem;
      gap: 2rem;
    }

    .navbar__logo {
      display: flex;
      align-items: center;
      gap: 0.15rem;
      text-decoration: none;
      font-weight: 800;
      font-size: 1.35rem;
      flex-shrink: 0;
      letter-spacing: -0.02em;
    }

    .navbar__logo-icon {
      color: #4255ff;
    }

    .navbar__logo-text {
      color: var(--app-text, #282e3e);
    }

    /* Desktop links */
    .navbar__links--desktop {
      display: flex;
      gap: 0.25rem;
      align-items: center;
    }

    .navbar__link {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.85rem;
      border-radius: 0.5rem;
      text-decoration: none;
      color: var(--app-text-secondary, #586380);
      font-weight: 600;
      font-size: 0.875rem;
      transition: all 0.15s;
    }

    .navbar__link:hover {
      background: var(--app-bg, #f6f7fb);
      color: var(--app-text, #282e3e);
    }

    .navbar__link--active {
      background: var(--app-primary-light, #edefff);
      color: #4255ff;
    }

    .navbar__link i {
      font-size: 0.85rem;
    }

    .navbar__right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Burger button — hidden on desktop */
    .navbar__burger {
      display: none;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      width: 2rem;
      height: 2rem;
      padding: 0.25rem;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 0.375rem;
      transition: background 0.15s;
    }

    .navbar__burger:hover {
      background: #f6f7fb;
    }

    .navbar__burger-line {
      display: block;
      width: 100%;
      height: 2px;
      background: #586380;
      border-radius: 1px;
      transition: transform 0.2s, opacity 0.2s;
    }

    .navbar__burger[aria-expanded="true"] .navbar__burger-line:nth-child(1) {
      transform: translateY(6px) rotate(45deg);
    }
    .navbar__burger[aria-expanded="true"] .navbar__burger-line:nth-child(2) {
      opacity: 0;
    }
    .navbar__burger[aria-expanded="true"] .navbar__burger-line:nth-child(3) {
      transform: translateY(-6px) rotate(-45deg);
    }

    /* Mobile drawer */
    .navbar__drawer {
      display: none;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.75rem 1rem 1rem;
      background: #ffffff;
      border-top: 1px solid #edeff5;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      animation: drawer-slide 0.2s ease-out;
    }

    .navbar__drawer .navbar__link {
      padding: 0.65rem 0.85rem;
      font-size: 0.95rem;
      width: 100%;
    }

    @keyframes drawer-slide {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ===== Mobile breakpoint ===== */
    @media (max-width: 640px) {
      .navbar__inner {
        padding: 0 0.75rem;
        gap: 0.5rem;
        height: 3rem;
      }

      .navbar__logo {
        font-size: 1.1rem;
      }

      .navbar__links--desktop {
        display: none;
      }

      .navbar__burger {
        display: flex;
      }

      .navbar__drawer {
        display: flex;
      }
    }
  `]
})
export class AuthNavbarComponent implements OnInit, OnDestroy {
  isAuthenticated = false;
  mobileOpen = signal(false);
  private store = inject(Store);
  private subscription = new Subscription();

  toggleMobile(): void {
    this.mobileOpen.update(v => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMobile();
  }

  ngOnInit(): void {
    this.subscription.add(
      this.store.select(selectIsAuthenticated).subscribe(isAuthenticated => {
        this.isAuthenticated = isAuthenticated;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
