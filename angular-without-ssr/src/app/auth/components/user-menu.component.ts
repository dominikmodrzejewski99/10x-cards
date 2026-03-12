import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { UserDTO } from '../../../types';
import { selectIsAuthenticated, selectUser } from '../store/auth.selectors';
import * as AuthActions from '../store/auth.actions';

@Component({
  selector: 'app-user-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule],
  host: {
    '(document:keydown.escape)': 'onEscape()'
  },
  template: `
    <div class="user-menu-container">
      @if (isAuthenticated && user?.is_anonymous) {
        <button class="logout-btn" (click)="onLogout()">
          <i class="pi pi-sign-out"></i>
          Wyloguj
        </button>
      } @else if (isAuthenticated) {
        <div class="user-menu-dropdown">
          <button class="user-menu-button" [class.is-open]="isMenuOpen" (click)="toggleMenu()">
            <div class="user-avatar">
              {{ getUserInitials() }}
            </div>
            <span class="user-email">{{ user?.email }}</span>
            <i class="pi pi-chevron-down chevron" [class.chevron--open]="isMenuOpen"></i>
          </button>

          @if (isMenuOpen) {
            <div class="dropdown-backdrop" (click)="closeMenu()"></div>
            <div class="dropdown-menu">
              <div class="dropdown-header">
                <div class="user-avatar user-avatar--lg">{{ getUserInitials() }}</div>
                <div class="user-info">
                  <span class="user-name">Moje konto</span>
                  <span class="user-email-small">{{ user?.email }}</span>
                </div>
              </div>
              <nav class="dropdown-nav">
                <a routerLink="/sets" class="dropdown-item" (click)="closeMenu()">
                  <i class="pi pi-folder"></i>
                  Moje zestawy
                </a>
                <a routerLink="/study" class="dropdown-item" (click)="closeMenu()">
                  <i class="pi pi-book"></i>
                  Nauka
                </a>
                <a routerLink="/generate" class="dropdown-item" (click)="closeMenu()">
                  <i class="pi pi-sparkles"></i>
                  Generuj fiszki
                </a>
              </nav>
              <div class="dropdown-footer">
                <button class="dropdown-item dropdown-item--logout" (click)="onLogout()">
                  <i class="pi pi-sign-out"></i>
                  Wyloguj się
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .user-menu-container {
      position: relative;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.85rem;
      border-radius: 0.5rem;
      border: 1.5px solid #d9dbe9;
      background: transparent;
      color: #586380;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.15s;
    }

    .logout-btn:hover {
      border-color: #ff6240;
      color: #ff6240;
      background: #fff0ed;
    }

    /* ---- Trigger button ---- */
    .user-menu-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.75rem 0.35rem 0.35rem;
      background: #ffffff;
      border: 1.5px solid #d9dbe9;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: #282e3e;
      font-weight: 500;
    }

    .user-menu-button:hover,
    .user-menu-button.is-open {
      background: #edefff;
      border-color: #4255ff;
      box-shadow: 0 0 0 3px rgba(66, 85, 255, 0.08);
    }

    .user-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.85rem;
      height: 1.85rem;
      background: linear-gradient(135deg, #4255ff 0%, #6c63ff 100%);
      color: #ffffff;
      border-radius: 50%;
      font-weight: 700;
      font-size: 0.8rem;
      flex-shrink: 0;
      letter-spacing: 0.02em;
    }

    .user-avatar--lg {
      width: 2.5rem;
      height: 2.5rem;
      font-size: 1rem;
    }

    .user-email {
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #282e3e;
      font-size: 0.8rem;
    }

    .chevron {
      font-size: 0.65rem;
      color: #586380;
      transition: transform 0.25s ease;
      margin-left: -0.1rem;
    }

    .chevron--open {
      transform: rotate(180deg);
    }

    /* ---- Backdrop (mobile-friendly close target) ---- */
    .dropdown-backdrop {
      position: fixed;
      inset: 0;
      z-index: 49;
    }

    /* ---- Dropdown panel ---- */
    .dropdown-menu {
      position: absolute;
      top: calc(100% + 0.5rem);
      right: 0;
      width: 260px;
      background: #ffffff;
      border-radius: 0.875rem;
      border: 1px solid #e5e7eb;
      box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.05),
        0 10px 24px -4px rgba(0, 0, 0, 0.1);
      z-index: 50;
      overflow: hidden;
      animation: dropdown-enter 0.18s ease-out;
    }

    @keyframes dropdown-enter {
      from {
        opacity: 0;
        transform: translateY(-6px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* ---- Header ---- */
    .dropdown-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1rem 0.85rem;
      background: linear-gradient(180deg, #f8f9fc 0%, #ffffff 100%);
      border-bottom: 1px solid #f0f1f5;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .user-name {
      font-weight: 700;
      font-size: 0.85rem;
      color: #282e3e;
      line-height: 1.3;
    }

    .user-email-small {
      font-size: 0.75rem;
      color: #586380;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ---- Nav section ---- */
    .dropdown-nav {
      padding: 0.375rem 0;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.6rem 1rem;
      color: #3b4252;
      text-decoration: none;
      transition: all 0.12s ease;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-family: inherit;
    }

    .dropdown-item i {
      font-size: 0.95rem;
      color: #8b92a5;
      width: 1.25rem;
      text-align: center;
      transition: color 0.12s ease;
    }

    .dropdown-item:hover {
      background: #f4f5ff;
      color: #4255ff;
    }

    .dropdown-item:hover i {
      color: #4255ff;
    }

    /* ---- Footer / Logout ---- */
    .dropdown-footer {
      border-top: 1px solid #f0f1f5;
      padding: 0.375rem 0;
    }

    .dropdown-item--logout {
      color: #dc3545;
    }

    .dropdown-item--logout i {
      color: #dc3545;
    }

    .dropdown-item--logout:hover {
      background: #fef2f2;
      color: #b91c1c;
    }

    .dropdown-item--logout:hover i {
      color: #b91c1c;
    }

    /* ---- Mobile ---- */
    @media (max-width: 640px) {
      .user-menu-button {
        padding: 0.2rem;
        border: none;
        background: none;
        border-radius: 50%;
        box-shadow: none;
      }

      .user-menu-button:hover,
      .user-menu-button.is-open {
        background: #f6f7fb;
        border-color: transparent;
        box-shadow: none;
      }

      .user-menu-button .user-email,
      .user-menu-button .chevron {
        display: none;
      }

      .user-avatar {
        width: 2rem;
        height: 2rem;
        font-size: 0.8rem;
      }

      .logout-btn {
        padding: 0.35rem 0.65rem;
        font-size: 0.8rem;
      }

      .dropdown-menu {
        width: 240px;
        right: -0.5rem;
      }
    }
  `]
})
export class UserMenuComponent implements OnInit, OnDestroy {
  public isAuthenticated: boolean = false;
  public user: UserDTO | null = null;
  public isMenuOpen: boolean = false;

  private store: Store = inject(Store);
  private subscriptions: Subscription = new Subscription();

  public getUserInitials(): string {
    if (!this.user?.email) return '?';
    return this.user.email.charAt(0).toUpperCase();
  }

  public toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  public closeMenu(): void {
    this.isMenuOpen = false;
  }

  public onEscape(): void {
    if (this.isMenuOpen) this.closeMenu();
  }

  public ngOnInit(): void {
    this.subscriptions.add(
      this.store.select(selectIsAuthenticated).subscribe((isAuthenticated: boolean) => {
        this.isAuthenticated = isAuthenticated;
      })
    );

    this.subscriptions.add(
      this.store.select(selectUser).subscribe((user: UserDTO | null) => {
        this.user = user;
      })
    );
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  public onLogout(): void {
    this.closeMenu();
    this.store.dispatch(AuthActions.logout());
  }
}
