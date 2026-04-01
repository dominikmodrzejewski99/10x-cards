import { Injectable, signal, WritableSignal } from '@angular/core';

export type ConsentStatus = 'pending' | 'accepted' | 'rejected';

const STORAGE_KEY = 'cookie-consent';

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
    localStorage.setItem(STORAGE_KEY, status);
    this.status.set(status);
  }

  private loadStatus(): ConsentStatus {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'accepted' || stored === 'rejected') return stored;
    return 'pending';
  }
}
