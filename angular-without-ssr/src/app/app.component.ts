import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';
import { Store, ActionsSubject } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthNavbarComponent } from './shared/components/auth-navbar.component';
import { OnboardingComponent } from './components/onboarding/onboarding.component';
import { selectIsAuthenticated } from './auth/store/auth.selectors';
import * as AuthActions from './auth/store/auth.actions';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [ButtonModule, RouterModule, AuthNavbarComponent, OnboardingComponent],
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  title = '10xCards - Twórz i zarządzaj fiszkami efektywnie';
  currentYear = new Date().getFullYear();
  isAuthenticated = false;

  @ViewChild(OnboardingComponent) onboarding!: OnboardingComponent;

  private store = inject(Store);
  private actionsSubject = inject(ActionsSubject);
  private subscription = new Subscription();
  private pendingOnboarding = false;
  private viewReady = false;

  ngOnInit(): void {
    this.store.dispatch(AuthActions.checkAuthState());

    this.subscription.add(
      this.store.select(selectIsAuthenticated).subscribe(v => this.isAuthenticated = v)
    );

    this.subscription.add(
      this.actionsSubject.pipe(
        filter((action) =>
          action.type === AuthActions.registerSuccess.type ||
          action.type === AuthActions.loginAnonymouslySuccess.type
        )
      ).subscribe(() => {
        this.triggerOnboarding();
      })
    );
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.pendingOnboarding) {
      this.pendingOnboarding = false;
      setTimeout(() => this.onboarding?.checkAndShow(), 300);
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private triggerOnboarding(): void {
    if (this.viewReady && this.onboarding) {
      setTimeout(() => this.onboarding.checkAndShow(), 300);
    } else {
      this.pendingOnboarding = true;
    }
  }
}
