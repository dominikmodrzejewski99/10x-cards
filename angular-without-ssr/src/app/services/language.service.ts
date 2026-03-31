import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { UserPreferencesService } from './user-preferences.service';
import { AppLanguage } from '../../types';

const STORAGE_KEY = 'memlo-lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translocoService: TranslocoService = inject(TranslocoService);
  private prefsService: UserPreferencesService = inject(UserPreferencesService);

  public readonly language: WritableSignal<AppLanguage> = signal<AppLanguage>(this.resolveDefault());

  /** Load language from DB and apply it. Called once after auth is ready. */
  public loadLanguage(): void {
    this.prefsService.getPreferences().subscribe(prefs => {
      this.applyLanguage(prefs.language ?? this.resolveDefault());
    });
  }

  /** Change language, persist to DB and localStorage. */
  public setLanguage(lang: AppLanguage): void {
    this.applyLanguage(lang);
    this.prefsService.updatePreferences({ language: lang }).subscribe();
  }

  /** Reset to browser default on logout. */
  public resetLanguage(): void {
    this.applyLanguage(this.resolveDefault());
  }

  private applyLanguage(lang: AppLanguage): void {
    this.language.set(lang);
    this.translocoService.setActiveLang(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }

  private resolveDefault(): AppLanguage {
    const stored: string | null = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'pl') return stored;
    return typeof navigator !== 'undefined' && navigator.language?.startsWith('en') ? 'en' : 'pl';
  }
}
