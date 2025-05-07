import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { UserDTO } from '../../../types';
import { selectIsAuthenticated, selectUser } from '../store/auth.selectors';
import * as AuthActions from '../store/auth.actions';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="user-menu-container">
      <ng-container *ngIf="isAuthenticated; else loginButton">
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

          <div class="dropdown-menu" *ngIf="isMenuOpen">
            <div class="dropdown-header">
              <div class="user-avatar">{{ getUserInitials() }}</div>
              <div class="user-info">
                <span class="user-email">{{ user?.email }}</span>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <a routerLink="/profile" class="dropdown-item" (click)="closeMenu()">
              <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Profil
            </a>
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
        </div>
      </ng-container>

      <ng-template #loginButton>
        <div class="auth-buttons">
          <a routerLink="/login" class="login-button">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            Zaloguj
          </a>
          <a routerLink="/register" class="register-button">
            <svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            Rejestracja
          </a>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .user-menu-container {
      position: relative;
    }

    .user-menu-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background-color: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s;
      color: white;
      font-weight: 500;
    }

    .user-menu-button:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }

    .user-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      background-color: #2563eb;
      color: white;
      border-radius: 50%;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .user-email {
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .icon {
      width: 1.25rem;
      height: 1.25rem;
    }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 0.5rem);
      right: 0;
      width: 250px;
      background-color: white;
      border-radius: 0.5rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      z-index: 50;
      overflow: hidden;
    }

    .dropdown-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background-color: #f9fafb;
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .dropdown-divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 0.25rem 0;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      color: #4b5563;
      text-decoration: none;
      transition: all 0.2s;
      cursor: pointer;
    }

    .dropdown-item:hover {
      background-color: #f3f4f6;
      color: #1f2937;
    }

    .logout-button {
      color: #dc2626;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      font-size: 1rem;
    }

    .logout-button:hover {
      background-color: #fef2f2;
    }

    .auth-buttons {
      display: flex;
      gap: 0.75rem;
    }

    .login-button, .register-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      color: white;
      border-radius: 9999px;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.2s;
    }

    .login-button {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .register-button {
      background-color: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .login-button:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }

    .register-button:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .login-button .icon, .register-button .icon {
      stroke: white;
      width: 1rem;
      height: 1rem;
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
