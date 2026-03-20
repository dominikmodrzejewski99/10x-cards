import { Component, ChangeDetectionStrategy, OnDestroy, AfterViewInit, ViewChild, inject, Signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store, ActionsSubject } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthNavbarComponent } from './shared/components/auth-navbar.component';
import { OnboardingComponent } from './components/onboarding/onboarding.component';
import { selectIsAuthenticated } from './auth/store';
import * as AuthActions from './auth/store/auth.actions';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, RouterModule, AuthNavbarComponent, OnboardingComponent],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private store: Store = inject(Store);
  private actionsSubject: ActionsSubject = inject(ActionsSubject);

  public isAuthenticatedSignal: Signal<boolean> = toSignal(this.store.select(selectIsAuthenticated), { initialValue: false });
  public title: string = '10xCards - Twórz i zarządzaj fiszkami efektywnie';
  public currentYear: number = new Date().getFullYear();

  @ViewChild(OnboardingComponent) private onboarding!: OnboardingComponent;

  private pendingOnboarding: boolean = false;
  private viewReady: boolean = false;
  private subscription: Subscription = new Subscription();

  constructor() {
    this.store.dispatch(AuthActions.checkAuthState());

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

  public ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.pendingOnboarding) {
      this.pendingOnboarding = false;
      setTimeout(() => this.onboarding?.checkAndShow(), 300);
    }
  }

  public ngOnDestroy(): void {
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
