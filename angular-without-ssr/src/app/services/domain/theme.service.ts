import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { UserPreferencesService } from './user-preferences.service';
import { LoggerService } from '../infrastructure/logger.service';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private prefsService = inject(UserPreferencesService);
  private logger = inject(LoggerService);

  public readonly theme: WritableSignal<Theme> = signal<Theme>('light');

  /** Load theme from DB and apply it. Called once after auth is ready. */
  loadTheme(): void {
    this.prefsService.getPreferences().subscribe(prefs => {
      this.applyTheme(prefs.theme ?? 'light');
    });
  }

  /** Toggle and persist theme to DB. */
  setTheme(theme: Theme): void {
    this.applyTheme(theme);
    this.prefsService.updatePreferences({ theme }).subscribe({
      error: (err: unknown) => this.logger.error('ThemeService.setTheme', err),
    });
  }

  /** Apply theme to the document root. */
  private applyTheme(theme: Theme): void {
    this.theme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  /** Reset to light on logout. */
  resetTheme(): void {
    this.applyTheme('light');
  }
}
