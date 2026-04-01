import { Injectable, signal, WritableSignal } from '@angular/core';

export type ConsentStatus = 'pending' | 'accepted' | 'rejected';

const COOKIE_NAME = 'cookie_consent';
const MAX_AGE_DAYS = 365;

@Injectable({ providedIn: 'root' })
export class CookieConsentService {
  readonly status: WritableSignal<ConsentStatus> = signal<ConsentStatus>(this.loadStatus());

  get hasDecided(): boolean {
    return this.status() !== 'pending';
  }

  get analyticsAllowed(): boolean {
    return this.status() === 'accepted';
  }

  accept(): void {
    this.setStatus('accepted');
  }

  reject(): void {
    this.setStatus('rejected');
  }

  private setStatus(status: ConsentStatus): void {
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${COOKIE_NAME}=${status}; path=/; max-age=${maxAge}; SameSite=Strict; Secure`;
    this.status.set(status);
  }

  private loadStatus(): ConsentStatus {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
    const value = match?.[1];
    if (value === 'accepted' || value === 'rejected') return value;
    return 'pending';
  }
}
