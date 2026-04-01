import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, inject, effect, Signal, WritableSignal, signal, OnDestroy } from '@angular/core';
import { Router, RouterModule, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthNavbarComponent } from './shared/components/auth-navbar.component';
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';
import { OnboardingComponent } from './components/onboarding/onboarding.component';
import { CookieConsentComponent } from './shared/components/cookie-consent/cookie-consent.component';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthStore } from './auth/store';
import { UpdateService } from './services/update.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, ToastModule, AuthNavbarComponent, BottomNavComponent, OnboardingComponent, CookieConsentComponent, TranslocoPipe],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  private readonly updateService: UpdateService = inject(UpdateService);
  private readonly router: Router = inject(Router);

  public isAuthenticatedSignal: Signal<boolean> = this.authStore.isAuthenticated;
  public navigatingSignal: WritableSignal<boolean> = signal<boolean>(false);
  public title: string = 'Memlo - Twórz i zarządzaj fiszkami efektywnie';
  public currentYear: number = new Date().getFullYear();

  private routerSub: Subscription;

  @ViewChild(OnboardingComponent) private onboarding!: OnboardingComponent;

  private pendingOnboarding: boolean = false;
  private viewReady: boolean = false;

  constructor() {
    this.authStore.checkAuthState();
    this.updateService.checkForUpdates();

    this.routerSub = this.router.events.pipe(
      filter((e): e is NavigationStart | NavigationEnd | NavigationCancel | NavigationError =>
        e instanceof NavigationStart ||
        e instanceof NavigationEnd ||
        e instanceof NavigationCancel ||
        e instanceof NavigationError
      )
    ).subscribe((e) => {
      this.navigatingSignal.set(e instanceof NavigationStart);
    });

    effect(() => {
      const trigger: number = this.authStore.onboardingTrigger();
      if (trigger > 0) {
        this.triggerOnboarding();
      }
    });
  }

  public ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.pendingOnboarding) {
      this.pendingOnboarding = false;
      setTimeout(() => this.onboarding?.checkAndShow(), 300);
    }
  }

  public ngOnDestroy(): void {
    this.routerSub.unsubscribe();
  }

  private triggerOnboarding(): void {
    if (this.viewReady && this.onboarding) {
      setTimeout(() => this.onboarding.checkAndShow(), 300);
    } else {
      this.pendingOnboarding = true;
    }
  }
}
