import { TestBed } from '@angular/core/testing';
import { CookieConsentService } from './cookie-consent.service';

describe('CookieConsentService', () => {
  let service: CookieConsentService;

  beforeEach(() => {
    document.cookie = 'cookie_consent=; path=/; max-age=0';
    TestBed.configureTestingModule({ providers: [CookieConsentService] });
    service = TestBed.inject(CookieConsentService);
  });

  afterEach(() => {
    document.cookie = 'cookie_consent=; path=/; max-age=0';
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
    expect(document.cookie).toContain('cookie_consent=accepted');
  });

  it('powinien ustawic rejected po reject()', () => {
    service.reject();
    expect(service.status()).toBe('rejected');
    expect(service.hasDecided).toBeTrue();
    expect(service.analyticsAllowed).toBeFalse();
    expect(document.cookie).toContain('cookie_consent=rejected');
  });

  it('powinien odczytac zapisany status z cookie', () => {
    document.cookie = 'cookie_consent=accepted; path=/';
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [CookieConsentService] });
    const newService = TestBed.inject(CookieConsentService);
    expect(newService.status()).toBe('accepted');
  });
});
