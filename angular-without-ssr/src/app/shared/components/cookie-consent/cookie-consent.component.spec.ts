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

  it('powinien ukryc banner po akceptacji', () => {
    component.accept();
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('.consent');
    expect(banner).toBeFalsy();
  });

  it('powinien ukryc banner po odrzuceniu', () => {
    component.reject();
    fixture.detectChanges();
    const banner = fixture.nativeElement.querySelector('.consent');
    expect(banner).toBeFalsy();
  });

  it('powinien wywolac consentService.accept', () => {
    spyOn(consentService, 'accept');
    component.accept();
    expect(consentService.accept).toHaveBeenCalled();
  });

  it('powinien wywolac consentService.reject', () => {
    spyOn(consentService, 'reject');
    component.reject();
    expect(consentService.reject).toHaveBeenCalled();
  });
});
