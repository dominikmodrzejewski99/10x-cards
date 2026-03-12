import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { UserDTO } from '../../../types';
import { selectIsAuthenticated, selectUser } from '../store/auth.selectors';
import * as AuthActions from '../store/auth.actions';

@Component({
  selector: 'app-user-menu',
  imports: [RouterModule],
  template: `
    <div class="user-menu-container">
      @if (isAuthenticated && user?.is_anonymous) {
        <button class="logout-btn" (click)="onLogout()">
          <i class="pi pi-sign-out"></i>
          Wyloguj
        </button>
      } @else if (isAuthenticated) {
        <div class="user-menu-dropdown">
          <button class="user-menu-button" (click)="toggleMenu()">
            <div class="user-avatar">
              {{ getUserInitials() }}
            </div>
            <span class="user-email">{{ user?.email }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          @if (isMenuOpen) {
            <div class="dropdown-menu">
              <div class="dropdown-header">
                <div class="user-avatar">{{ getUserInitials() }}</div>
                <div class="user-info">
                  <span class="user-email">{{ user?.email }}</span>
                </div>
              </div>
              <div class="dropdown-divider"></div>
              <a routerLink="/flashcards" class="dropdown-item" (click)="closeMenu()">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                Moje fiszki
              </a>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item logout-button" (click)="onLogout()">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Wyloguj się
              </button>
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

    .user-menu-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background-color: #f6f7fb;
      border: 1.5px solid #d9dbe9;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s;
      color: #282e3e;
      font-weight: 500;
    }

    .user-menu-button:hover {
      background-color: #edefff;
      border-color: #4255ff;
    }

    .user-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      background-color: #4255ff;
      color: #ffffff;
      border-radius: 50%;
      font-weight: 600;
      font-size: 0.875rem;
      flex-shrink: 0;
    }

    .user-email {
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #282e3e;
      font-size: 0.8rem;
    }

    .icon {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
      stroke: #586380;
    }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 0.5rem);
      right: 0;
      width: 250px;
      background-color: #ffffff;
      border-radius: 0.75rem;
      border: 1px solid #d9dbe9;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      z-index: 50;
      overflow: hidden;
    }

    .dropdown-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #282e3e;
      padding: 1rem;
      background-color: #f6f7fb;
    }

    .dropdown-header .user-email {
      color: #282e3e;
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .dropdown-divider {
      height: 1px;
      background-color: #d9dbe9;
      margin: 0.25rem 0;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      color: #282e3e;
      text-decoration: none;
      transition: all 0.15s;
      cursor: pointer;
    }

    .dropdown-item .icon {
      stroke: #586380;
    }

    .dropdown-item:hover {
      background-color: #edefff;
      color: #4255ff;
    }

    .dropdown-item:hover .icon {
      stroke: #4255ff;
    }

    .logout-button {
      color: #ff6240;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-size: 0.9rem;
    }

    .logout-button .icon {
      stroke: #ff6240;
    }

    .logout-button:hover {
      background-color: #fff0ed;
      color: #ff6240;
    }

    @media (max-width: 640px) {
      .user-menu-button {
        padding: 0.2rem;
        border: none;
        background: none;
        border-radius: 50%;
      }

      .user-menu-button:hover {
        background: #f6f7fb;
        border-color: transparent;
      }

      .user-menu-button .user-email,
      .user-menu-button .icon {
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
        width: 220px;
        right: 0;
      }

      .dropdown-header {
        padding: 0.75rem;
        gap: 0.5rem;
      }

      .dropdown-item {
        padding: 0.6rem 0.85rem;
        gap: 0.5rem;
        font-size: 0.9rem;
      }
    }

    /* Style dla desktopu - mniejsza czcionka dla przycisku/emaila */
    @media (min-width: 1024px) {
      .user-menu-button .user-email {
        font-size: 0.75rem;
        max-width: 200px;
      }

      /* Zmniejszenie czcionki dla emaila w nagłówku dropdownu na desktopie */
      .dropdown-menu .user-email {
        font-size: 0.75rem; /* Taki sam rozmiar jak dla emaila w przycisku */
      }
    }
  `]
})
export class UserMenuComponent implements OnInit, OnDestroy {
  isAuthenticated = false;
  user: UserDTO | null = null;
  isMenuOpen = false;

  private subscriptions = new Subscription();

  getUserInitials(): string {
    if (!this.user?.email) return '?';
    return this.user.email.charAt(0).toUpperCase();
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  constructor(private store: Store) {}

  ngOnInit(): void {
    // Subskrybuj stan autentykacji i dane użytkownika z NgRx store
    this.subscriptions.add(
      this.store.select(selectIsAuthenticated).subscribe(isAuthenticated => {
        this.isAuthenticated = isAuthenticated;
      })
    );

    this.subscriptions.add(
      this.store.select(selectUser).subscribe(user => {
        this.user = user;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onLogout(): void {
    this.closeMenu();
    this.store.dispatch(AuthActions.logout());
  }
}
