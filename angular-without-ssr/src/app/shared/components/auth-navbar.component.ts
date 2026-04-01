import { Component, ChangeDetectionStrategy, inject, signal, WritableSignal, Signal, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { UserMenuComponent } from '../../auth/components/user-menu.component';
import { TranslocoDirective } from '@jsverse/transloco';
import { PomodoroTimerComponent } from './pomodoro-timer/pomodoro-timer.component';
import { NotificationBellComponent } from './notification-bell/notification-bell.component';
import { AuthStore } from '../../auth/store';

@Component({
  selector: 'app-auth-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, UserMenuComponent, PomodoroTimerComponent, NotificationBellComponent, TranslocoDirective],
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '(document:click)': 'onDocumentClick($event)'
  },
  template: `
    <ng-container *transloco="let t; prefix: 'nav'">
      <nav class="navbar">
        <div class="navbar__inner">
          <a routerLink="/" class="navbar__logo">
            <img src="/assets/logo-memlo.svg" alt="memlo" class="navbar__logo-img" width="120" height="29" />
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
              <a routerLink="/explore" routerLinkActive="navbar__link--active" class="navbar__link">
                <i class="pi pi-search"></i> {{ t('explore') }}
              </a>
              <a routerLink="/friends" routerLinkActive="navbar__link--active" class="navbar__link">
                <i class="pi pi-users"></i> {{ t('friends') }}
              </a>
            }
          </div>

          <div class="navbar__right">
            @if (authCheckedSignal() && isAuthenticatedSignal()) {
              <app-pomodoro-timer></app-pomodoro-timer>
              <app-notification-bell></app-notification-bell>
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
            <a routerLink="/explore" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
              <i class="pi pi-search"></i> {{ t('explore') }}
            </a>
            <a routerLink="/friends" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
              <i class="pi pi-users"></i> {{ t('friends') }}
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
