import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Serwis do zarządzania przekierowaniami związanymi z autentykacją
 */
@Injectable({
  providedIn: 'root'
})
export class AuthRedirectService {
  private redirectUrl: string | null = null;

  constructor(private router: Router) {}

  /**
   * Zapisuje URL, do którego użytkownik próbował uzyskać dostęp
   * @param url URL, do którego użytkownik próbował uzyskać dostęp
   */
  setRedirectUrl(url: string): void {
    // Zapisujemy tylko URL-e, które nie są związane z autentykacją
    if (!url.includes('/login') && !url.includes('/register') && 
        !url.includes('/reset-password') && !url.includes('/set-new-password')) {
      this.redirectUrl = url;
    }
  }

  /**
   * Pobiera zapisany URL przekierowania i czyści go
   * @returns Zapisany URL przekierowania lub null, jeśli nie ma zapisanego URL-a
   */
  getRedirectUrl(): string | null {
    const url = this.redirectUrl;
    this.redirectUrl = null;
    return url;
  }

  /**
   * Przekierowuje użytkownika do zapisanego URL-a lub do domyślnego URL-a
   * @param defaultUrl Domyślny URL, do którego użytkownik zostanie przekierowany, jeśli nie ma zapisanego URL-a
   */
  redirectToSavedUrlOrDefault(defaultUrl: string = '/generate'): void {
    const redirectUrl = this.getRedirectUrl();
    this.router.navigateByUrl(redirectUrl || defaultUrl);
  }
}
