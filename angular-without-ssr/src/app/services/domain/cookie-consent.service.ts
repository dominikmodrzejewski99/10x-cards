import { Injectable, inject, signal, WritableSignal, computed } from '@angular/core';
import { SentryService } from '../infrastructure/sentry.service';

export interface ConsentPreferences {
  necessary: true;
  analytics: boolean;
}

const COOKIE_NAME = 'cookie_consent';
const MAX_AGE_DAYS = 365;

@Injectable({ providedIn: 'root' })
export class CookieConsentService {
  private readonly sentryService: SentryService = inject(SentryService);

  readonly preferences: WritableSignal<ConsentPreferences | null> = signal<ConsentPreferences | null>(this.loadPreferences());

  readonly hasDecided = computed(() => this.preferences() !== null);
  readonly analyticsAllowed = computed(() => this.preferences()?.analytics === true);

  acceptAll(): void {
    this.save({ necessary: true, analytics: true });
  }

  rejectNonEssential(): void {
    this.save({ necessary: true, analytics: false });
  }

  saveCustom(prefs: ConsentPreferences): void {
    this.save(prefs);
  }

  reset(): void {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
    this.preferences.set(null);
  }

  private save(prefs: ConsentPreferences): void {
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
    const encoded = encodeURIComponent(JSON.stringify(prefs));
    document.cookie = `${COOKIE_NAME}=${encoded}; path=/; max-age=${maxAge}; SameSite=Strict; Secure`;
    this.preferences.set(prefs);

    if (!prefs.analytics) {
      this.sentryService.disable();
    }
  }

  private loadPreferences(): ConsentPreferences | null {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
    if (!match?.[1]) return null;
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      if (typeof parsed === 'object' && parsed !== null && 'necessary' in parsed) {
        return parsed as ConsentPreferences;
      }
    } catch {
      // Legacy string format migration
      if (match[1] === 'accepted') return { necessary: true, analytics: true };
      if (match[1] === 'rejected') return { necessary: true, analytics: false };
    }
    return null;
  }
}
