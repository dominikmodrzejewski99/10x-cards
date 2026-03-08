import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { UserMenuComponent } from '../../auth/components/user-menu.component';
import { selectIsAuthenticated } from '../../auth/store/auth.selectors';

@Component({
  selector: 'app-auth-navbar',
  standalone: true,
  imports: [RouterModule, UserMenuComponent],
  template: `
    <nav class="navbar">
      <div class="navbar__inner">
        <a routerLink="/" class="navbar__logo">
          <span class="navbar__logo-icon">10x</span>
          <span class="navbar__logo-text">Cards</span>
        </a>

        <div class="navbar__links">
          @if (isAuthenticated) {
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
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: #ffffff;
      border-bottom: 2px solid #d9dbe9;
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
      color: #282e3e;
    }

    .navbar__links {
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
      color: #586380;
      font-weight: 600;
      font-size: 0.875rem;
      transition: all 0.15s;
    }

    .navbar__link:hover {
      background: #f6f7fb;
      color: #282e3e;
    }

    .navbar__link--active {
      background: #edefff;
      color: #4255ff;
    }

    .navbar__link i {
      font-size: 0.85rem;
    }

    .navbar__right {
      margin-left: auto;
      display: flex;
      align-items: center;
    }

    @media (max-width: 640px) {
      .navbar__inner {
        padding: 0 0.75rem;
        gap: 0.5rem;
        height: 3rem;
      }

      .navbar__logo {
        font-size: 1.1rem;
      }

      .navbar__links {
        gap: 0.125rem;
      }

      .navbar__link {
        font-size: 0.75rem;
        padding: 0.35rem 0.5rem;
        gap: 0.25rem;
      }

      .navbar__link i { display: none; }
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
