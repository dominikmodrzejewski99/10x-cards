import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { UserPreferencesService } from './user-preferences.service';
import { LoggerService } from '../infrastructure/logger.service';
import { AppLanguage } from '../../../types';

const STORAGE_KEY = 'memlo-lang';
const SUPPORTED_LANGS: readonly string[] = ['pl', 'en', 'de', 'es', 'fr', 'uk'];

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translocoService: TranslocoService = inject(TranslocoService);
  private prefsService: UserPreferencesService = inject(UserPreferencesService);
  private logger: LoggerService = inject(LoggerService);
  private initialized: boolean = false;

  public readonly language: WritableSignal<AppLanguage> = signal<AppLanguage>(this.resolveDefault());

  /** Load language from DB and apply it. Called once after auth is ready. */
  public loadLanguage(): void {
    // If user already changed language this session, don't overwrite with DB value
    if (this.initialized) return;

    this.prefsService.getPreferences().subscribe({
      next: (prefs) => {
        this.initialized = true;
        this.applyLanguage(prefs.language ?? this.resolveDefault());
      },
      error: (err: unknown) => this.logger.error('LanguageService.loadLanguage', err),
    });
  }

  /** Change language, persist to DB and localStorage. */
  public setLanguage(lang: AppLanguage): void {
    this.initialized = true;
    this.applyLanguage(lang);
    this.prefsService.updatePreferences({ language: lang }).subscribe({
      error: (err: unknown) => this.logger.error('LanguageService.setLanguage', err),
    });
  }

  /** Reset to browser default on logout. */
  public resetLanguage(): void {
    this.initialized = false;
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
    if (stored && SUPPORTED_LANGS.includes(stored)) return stored as AppLanguage;
    return typeof navigator !== 'undefined' && navigator.language?.startsWith('en') ? 'en' : 'pl';
  }
}
