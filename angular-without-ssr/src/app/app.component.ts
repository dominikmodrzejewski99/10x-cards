import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, inject, effect, Signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';
import { AuthNavbarComponent } from './shared/components/auth-navbar.component';
import { OnboardingComponent } from './components/onboarding/onboarding.component';
import { AuthStore } from './auth/store';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, RouterModule, AuthNavbarComponent, OnboardingComponent],
})
export class AppComponent implements AfterViewInit {
  private authStore = inject(AuthStore);

  public isAuthenticatedSignal: Signal<boolean> = this.authStore.isAuthenticated;
  public title: string = '10xCards - Twórz i zarządzaj fiszkami efektywnie';
  public currentYear: number = new Date().getFullYear();

  @ViewChild(OnboardingComponent) private onboarding!: OnboardingComponent;

  private pendingOnboarding: boolean = false;
  private viewReady: boolean = false;

  constructor() {
    this.authStore.checkAuthState();

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

  private triggerOnboarding(): void {
    if (this.viewReady && this.onboarding) {
      setTimeout(() => this.onboarding.checkAndShow(), 300);
    } else {
      this.pendingOnboarding = true;
    }
  }
}
