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

  it('powinien miec preferences null domyslnie', () => {
    expect(service.preferences()).toBeNull();
    expect(service.hasDecided()).toBeFalse();
    expect(service.analyticsAllowed()).toBeFalse();
  });

  it('powinien ustawic analytics=true po acceptAll()', () => {
    service.acceptAll();
    expect(service.preferences()).toEqual({ necessary: true, analytics: true });
    expect(service.hasDecided()).toBeTrue();
    expect(service.analyticsAllowed()).toBeTrue();
  });

  it('powinien ustawic analytics=false po rejectNonEssential()', () => {
    service.rejectNonEssential();
    expect(service.preferences()).toEqual({ necessary: true, analytics: false });
    expect(service.hasDecided()).toBeTrue();
    expect(service.analyticsAllowed()).toBeFalse();
  });

  it('powinien zapisac customowe preferencje', () => {
    service.saveCustom({ necessary: true, analytics: false });
    expect(service.preferences()?.analytics).toBeFalse();

    service.saveCustom({ necessary: true, analytics: true });
    expect(service.preferences()?.analytics).toBeTrue();
  });

  it('powinien odczytac preferencje z cookie', () => {
    document.cookie = 'cookie_consent=' + encodeURIComponent(JSON.stringify({ necessary: true, analytics: true })) + '; path=/';
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [CookieConsentService] });
    const newService = TestBed.inject(CookieConsentService);
    expect(newService.analyticsAllowed()).toBeTrue();
  });

  it('powinien migrowac legacy format "accepted"', () => {
    document.cookie = 'cookie_consent=accepted; path=/';
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [CookieConsentService] });
    const newService = TestBed.inject(CookieConsentService);
    expect(newService.analyticsAllowed()).toBeTrue();
  });

  it('powinien migrowac legacy format "rejected"', () => {
    document.cookie = 'cookie_consent=rejected; path=/';
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [CookieConsentService] });
    const newService = TestBed.inject(CookieConsentService);
    expect(newService.analyticsAllowed()).toBeFalse();
    expect(newService.hasDecided()).toBeTrue();
  });
});
