import { Injectable, inject, signal, Signal, WritableSignal } from '@angular/core';
import { UserPreferencesService } from '../domain/user-preferences.service';
import { LoggerService } from '../infrastructure/logger.service';

@Injectable({ providedIn: 'root' })
export class OnboardingFacadeService {
  private readonly preferencesService: UserPreferencesService = inject(UserPreferencesService);
  private readonly logger: LoggerService = inject(LoggerService);

  private readonly _onboardingCompleted: WritableSignal<boolean> = signal<boolean>(false);

  public readonly onboardingCompletedSignal: Signal<boolean> = this._onboardingCompleted.asReadonly();

  public checkOnboardingStatus(onShow: () => void): void {
    this.preferencesService.getPreferences().subscribe({
      next: (prefs) => {
        this._onboardingCompleted.set(prefs.onboarding_completed);
        if (!prefs.onboarding_completed) {
          onShow();
        }
      },
      error: () => {
        this._onboardingCompleted.set(false);
        onShow();
      },
    });
  }

  public completeOnboarding(): void {
    this._onboardingCompleted.set(true);
    this.preferencesService.setOnboardingCompleted().subscribe({
      error: (err: unknown) => this.logger.error('OnboardingFacadeService.completeOnboarding', err),
    });
  }
}
