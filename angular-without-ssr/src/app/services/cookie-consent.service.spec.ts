import { TestBed } from '@angular/core/testing';
import { CookieConsentService } from './cookie-consent.service';

describe('CookieConsentService', () => {
  let service: CookieConsentService;

  beforeEach(() => {
    localStorage.removeItem('cookie-consent');
    TestBed.configureTestingModule({ providers: [CookieConsentService] });
    service = TestBed.inject(CookieConsentService);
  });

  afterEach(() => {
    localStorage.removeItem('cookie-consent');
  });

  it('powinien zostac utworzony', () => {
    expect(service).toBeTruthy();
  });

  it('powinien miec status pending domyslnie', () => {
    expect(service.status()).toBe('pending');
    expect(service.hasDecided).toBeFalse();
    expect(service.analyticsAllowed).toBeFalse();
  });

  it('powinien ustawic accepted po accept()', () => {
    service.accept();
    expect(service.status()).toBe('accepted');
    expect(service.hasDecided).toBeTrue();
    expect(service.analyticsAllowed).toBeTrue();
    expect(localStorage.getItem('cookie-consent')).toBe('accepted');
  });

  it('powinien ustawic rejected po reject()', () => {
    service.reject();
    expect(service.status()).toBe('rejected');
    expect(service.hasDecided).toBeTrue();
    expect(service.analyticsAllowed).toBeFalse();
    expect(localStorage.getItem('cookie-consent')).toBe('rejected');
  });

  it('powinien odczytac zapisany status z localStorage', () => {
    localStorage.setItem('cookie-consent', 'accepted');
    const freshService = TestBed.inject(CookieConsentService);
    // Note: singleton so same instance, but loadStatus runs in constructor
    // Test with fresh instance by re-creating
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [CookieConsentService] });
    const newService = TestBed.inject(CookieConsentService);
    expect(newService.status()).toBe('accepted');
  });
});
