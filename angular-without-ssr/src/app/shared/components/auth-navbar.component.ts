import { Component, ChangeDetectionStrategy, inject, signal, WritableSignal, Signal, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { UserMenuComponent } from '../../auth/components/user-menu.component';
import { TranslocoDirective } from '@jsverse/transloco';
import { PomodoroTimerComponent } from './pomodoro-timer/pomodoro-timer.component';
import { AuthStore } from '../../auth/store';

@Component({
  selector: 'app-auth-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, UserMenuComponent, PomodoroTimerComponent, TranslocoDirective],
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '(document:click)': 'onDocumentClick($event)'
  },
  template: `
    <ng-container *transloco="let t; prefix: 'nav'">
      <nav class="navbar">
        <div class="navbar__inner">
          <a routerLink="/" class="navbar__logo">
            <svg class="navbar__logo-svg" width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="nav-bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#5b6bff"/>
                  <stop offset="100%" stop-color="#3344ee"/>
                </linearGradient>
                <linearGradient id="nav-badge" x1="42" y1="30" x2="54" y2="42" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#22d67a"/>
                  <stop offset="100%" stop-color="#17b865"/>
                </linearGradient>
              </defs>
              <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#nav-bg)"/>
              <rect x="10" y="16" width="28" height="36" rx="5" fill="#fff" opacity="0.2" transform="rotate(-8 24 34)"/>
              <rect x="18" y="12" width="28" height="36" rx="5" fill="#fff" opacity="0.35"/>
              <rect x="24" y="8" width="28" height="36" rx="5" fill="#fff"/>
              <rect x="30" y="16" width="16" height="3" rx="1.5" fill="#4255ff" opacity="0.7"/>
              <rect x="30" y="23" width="12" height="3" rx="1.5" fill="#4255ff" opacity="0.35"/>
              <rect x="30" y="30" width="14" height="3" rx="1.5" fill="#4255ff" opacity="0.2"/>
              <circle cx="48" cy="40" r="10" fill="url(#nav-badge)"/>
              <path d="M43 40 L46 43 L53 36" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="navbar__logo-text">mem<span class="navbar__logo-accent">lo</span></span>
          </a>

          <!-- Desktop links (authenticated) -->
          <div class="navbar__links navbar__links--desktop">
            @if (authCheckedSignal() && isAuthenticatedSignal()) {
              <a routerLink="/dashboard" routerLinkActive="navbar__link--active" class="navbar__link">
                <i class="pi pi-home"></i> {{ t('dashboard') }}
              </a>
              <a routerLink="/sets" routerLinkActive="navbar__link--active" class="navbar__link">
                <i class="pi pi-folder"></i> {{ t('sets') }}
              </a>
              <div class="navbar__dropdown" (mouseenter)="openLearn()" (mouseleave)="scheduleCloseLearn()">
                <button class="navbar__link navbar__link--trigger"
                        [class.navbar__link--active]="isLearnRouteActive()"
                        (click)="toggleLearn()">
                  <i class="pi pi-graduation-cap"></i> {{ t('learn') }}
                  <i class="pi pi-chevron-down navbar__chevron" [class.navbar__chevron--open]="learnOpenSignal()"></i>
                </button>
                @if (learnOpenSignal()) {
                  <div class="navbar__dropdown-menu" (mouseenter)="openLearn()" (mouseleave)="scheduleCloseLearn()">
                    <a routerLink="/study" routerLinkActive="navbar__dropdown-item--active" class="navbar__dropdown-item" (click)="closeLearn()">
                      <i class="pi pi-book"></i> {{ t('study') }}
                    </a>
                    <a routerLink="/quiz" routerLinkActive="navbar__dropdown-item--active" class="navbar__dropdown-item" (click)="closeLearn()">
                      <i class="pi pi-file-edit"></i> {{ t('quiz') }}
                    </a>
                    <a routerLink="/language-test" routerLinkActive="navbar__dropdown-item--active" class="navbar__dropdown-item" (click)="closeLearn()">
                      <i class="pi pi-check-square"></i> {{ t('languageTests') }}
                    </a>
                    <div class="navbar__dropdown-divider"></div>
                    <a routerLink="/learning-guide" routerLinkActive="navbar__dropdown-item--active" class="navbar__dropdown-item" (click)="closeLearn()">
                      <i class="pi pi-lightbulb"></i> {{ t('guide') }}
                    </a>
                  </div>
                }
              </div>
              <a routerLink="/generate" routerLinkActive="navbar__link--active" class="navbar__link">
                <i class="pi pi-microchip-ai"></i> {{ t('generate') }}
              </a>
            }
          </div>

          <div class="navbar__right">
            @if (authCheckedSignal() && isAuthenticatedSignal()) {
              <app-pomodoro-timer></app-pomodoro-timer>
              <app-user-menu></app-user-menu>
              <button class="navbar__burger" (click)="toggleMobile()" [attr.aria-expanded]="mobileOpenSignal()">
                <span class="navbar__burger-line"></span>
                <span class="navbar__burger-line"></span>
                <span class="navbar__burger-line"></span>
              </button>
            } @else {
              <a routerLink="/login" class="navbar__auth-btn navbar__auth-btn--login">{{ t('login') }}</a>
              <a routerLink="/register" class="navbar__auth-btn navbar__auth-btn--register">{{ t('register') }}</a>
            }
          </div>
        </div>

        <!-- Mobile drawer -->
        @if (authCheckedSignal() && isAuthenticatedSignal() && mobileOpenSignal()) {
          <div class="navbar__drawer">
            <a routerLink="/dashboard" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
              <i class="pi pi-home"></i> {{ t('dashboard') }}
            </a>
            <a routerLink="/sets" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
              <i class="pi pi-folder"></i> {{ t('sets') }}
            </a>
            <div class="navbar__drawer-section">
              <span class="navbar__drawer-heading">{{ t('learn') }}</span>
              <a routerLink="/study" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
                <i class="pi pi-book"></i> {{ t('study') }}
              </a>
              <a routerLink="/quiz" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
                <i class="pi pi-file-edit"></i> {{ t('quiz') }}
              </a>
              <a routerLink="/language-test" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
                <i class="pi pi-check-square"></i> {{ t('languageTests') }}
              </a>
              <a routerLink="/learning-guide" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
                <i class="pi pi-lightbulb"></i> {{ t('guide') }}
              </a>
            </div>
            <a routerLink="/generate" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
              <i class="pi pi-microchip-ai"></i> {{ t('generate') }}
            </a>
          </div>
        }
      </nav>
    </ng-container>
  `,
  styleUrl: './auth-navbar.component.scss'
})
export class AuthNavbarComponent {
  private authStore = inject(AuthStore);
  private elementRef: ElementRef = inject(ElementRef);
  private router: Router = inject(Router);

  public authCheckedSignal: Signal<boolean> = this.authStore.authChecked;
  public isAuthenticatedSignal: Signal<boolean> = this.authStore.isAuthenticated;
  public isAnonymousSignal: Signal<boolean> = this.authStore.isAnonymous;
  public mobileOpenSignal: WritableSignal<boolean> = signal<boolean>(false);
  public learnOpenSignal: WritableSignal<boolean> = signal<boolean>(false);
  private learnCloseTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly learnRoutes: string[] = ['/study', '/quiz', '/language-test', '/learning-guide'];

  public isLearnRouteActive(): boolean {
    return this.learnRoutes.some((route: string) => this.router.url.startsWith(route));
  }

  public toggleLearn(): void {
    this.cancelCloseLearn();
    this.learnOpenSignal.update((v: boolean) => !v);
  }

  public openLearn(): void {
    this.cancelCloseLearn();
    this.learnOpenSignal.set(true);
  }

  public closeLearn(): void {
    this.cancelCloseLearn();
    this.learnOpenSignal.set(false);
  }

  public scheduleCloseLearn(): void {
    this.cancelCloseLearn();
    this.learnCloseTimer = setTimeout(() => {
      this.learnOpenSignal.set(false);
    }, 250);
  }

  private cancelCloseLearn(): void {
    if (this.learnCloseTimer) {
      clearTimeout(this.learnCloseTimer);
      this.learnCloseTimer = null;
    }
  }

  public toggleMobile(): void {
    this.mobileOpenSignal.update((v: boolean) => !v);
  }

  public closeMobile(): void {
    this.mobileOpenSignal.set(false);
  }

  public onEscape(): void {
    this.closeMobile();
    this.closeLearn();
  }

  public onDocumentClick(event: MouseEvent): void {
    if (this.mobileOpenSignal() && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeMobile();
    }
    if (this.learnOpenSignal() && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeLearn();
    }
  }
}
