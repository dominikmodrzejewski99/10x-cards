import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { CookieConsentComponent } from './cookie-consent.component';
import { CookieConsentService } from '../../../services/cookie-consent.service';

describe('CookieConsentComponent', () => {
  let component: CookieConsentComponent;
  let fixture: ComponentFixture<CookieConsentComponent>;
  let consentService: CookieConsentService;

  beforeEach(async () => {
    document.cookie = 'cookie_consent=; path=/; max-age=0';

    await TestBed.configureTestingModule({
      imports: [
        CookieConsentComponent,
        RouterModule.forRoot([]),
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CookieConsentComponent);
    component = fixture.componentInstance;
    consentService = TestBed.inject(CookieConsentService);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.cookie = 'cookie_consent=; path=/; max-age=0';
  });

  it('powinien utworzyc komponent', () => {
    expect(component).toBeTruthy();
  });

  it('powinien pokazac banner gdy brak decyzji', () => {
    const banner = fixture.nativeElement.querySelector('.consent');
    expect(banner).toBeTruthy();
  });

  it('powinien ukryc banner po acceptAll', () => {
    component.acceptAll();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.consent')).toBeFalsy();
  });

  it('powinien ukryc banner po rejectNonEssential', () => {
    component.rejectNonEssential();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.consent')).toBeFalsy();
  });

  it('powinien pokazac ustawienia po kliknieciu Dostosuj', () => {
    expect(fixture.nativeElement.querySelector('.consent__settings')).toBeFalsy();
    component.toggleSettings();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.consent__settings')).toBeTruthy();
  });

  it('powinien ukryc ustawienia po ponownym kliknieciu', () => {
    component.toggleSettings();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.consent__settings')).toBeTruthy();

    component.toggleSettings();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.consent__settings')).toBeFalsy();
  });

  it('powinien zapisac customowe preferencje', () => {
    component.analyticsEnabled.set(false);
    component.saveCustom();
    fixture.detectChanges();

    expect(consentService.analyticsAllowed()).toBeFalse();
    expect(fixture.nativeElement.querySelector('.consent')).toBeFalsy();
  });

  it('powinien miec analytics domyslnie wlaczone', () => {
    expect(component.analyticsEnabled()).toBeTrue();
  });
});
