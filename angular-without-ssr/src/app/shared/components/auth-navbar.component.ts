import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { UserMenuComponent } from '../../auth/components/user-menu.component';
import { selectIsAuthenticated } from '../../auth/store/auth.selectors';

@Component({
  selector: 'app-auth-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, UserMenuComponent],
  template: `
    <nav class="navbar">
      <div class="container">
        <div class="navbar-left">
          <a routerLink="/" class="logo">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="logo-image">
              <rect width="40" height="40" rx="10" fill="#2563EB" />
              <path d="M10 12H14L16.5 20L19 12H23L18 26H14L10 12Z" fill="white" />
              <path d="M24 12H28V16H24V12Z" fill="white" />
              <path d="M24 18H28V26H24V18Z" fill="white" />
              <path d="M32 12L35 16L32 20" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M8 28L5 24L8 20" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="logo-text">10xCards</span>
          </a>

          <div class="nav-links" *ngIf="isAuthenticated">
            <a routerLink="/generate" routerLinkActive="active" class="nav-link">Generuj fiszki</a>
            <a routerLink="/flashcards" routerLinkActive="active" class="nav-link">Moje fiszki</a>
          </div>
        </div>

        <div class="navbar-right">
          <app-user-menu></app-user-menu>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: linear-gradient(to right, #2563EB, #1E40AF);
      color: white;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      padding: 0.75rem 0;
      position: sticky;
      top: 0;
      z-index: 40;
    }

    .container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .navbar-left {
      display: flex;
      align-items: center;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: white;
      font-weight: 700;
      font-size: 1.25rem;
    }

    .logo-image {
      height: 2rem;
      width: auto;
    }

    .nav-links {
      display: flex;
      margin-left: 2rem;
      gap: 1.5rem;
    }

    .nav-link {
      color: white;
      text-decoration: none;
      font-weight: 500;
      padding: 0.5rem 0;
      position: relative;
      transition: all 0.2s;
    }

    .nav-link:hover {
      opacity: 0.9;
    }

    .nav-link.active {
      font-weight: 600;
    }

    .nav-link.active::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background-color: white;
    }

    .navbar-right {
      display: flex;
      align-items: center;
    }
  `]
})
export class AuthNavbarComponent implements OnInit, OnDestroy {
  isAuthenticated = false;
  private subscription = new Subscription();

  constructor(private store: Store) {}

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
