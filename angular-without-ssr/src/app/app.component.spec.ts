import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ToastService } from './shared/services/toast.service';
import { AppComponent } from './app.component';
import { AuthStore } from './auth/store';
import { UpdateService } from './services/infrastructure/update.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let mockAuthStore: {
    isAuthenticated: WritableSignal<boolean>;
    checkAuthState: jasmine.Spy;
    onboardingTrigger: WritableSignal<number>;
  };

  beforeEach(async () => {
    mockAuthStore = {
      isAuthenticated: signal<boolean>(false),
      checkAuthState: jasmine.createSpy('checkAuthState'),
      onboardingTrigger: signal<number>(0),
      authChecked: signal<boolean>(true),
      isAnonymous: signal<boolean>(false),
      user: signal(null),
      logout: jasmine.createSpy('logout'),
      deleteAccount: jasmine.createSpy('deleteAccount'),
    } as unknown as typeof mockAuthStore;

    const mockUpdateService: { checkForUpdates: jasmine.Spy } = {
      checkForUpdates: jasmine.createSpy('checkForUpdates'),
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent, TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' } })],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: UpdateService, useValue: mockUpdateService },
        ToastService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct title', () => {
    expect(component.title).toContain('Memlo');
  });

  it('should set currentYear to current year', () => {
    const currentYear: number = new Date().getFullYear();
    expect(component.currentYear).toBe(currentYear);
  });

  it('should call checkAuthState on creation', () => {
    expect(mockAuthStore.checkAuthState).toHaveBeenCalled();
  });

  it('should expose isAuthenticatedSignal from auth store', () => {
    expect(component.isAuthenticatedSignal()).toBeFalse();
    mockAuthStore.isAuthenticated.set(true);
    expect(component.isAuthenticatedSignal()).toBeTrue();
  });

  it('should render app-auth-navbar component', () => {
    const el: HTMLElement = fixture.nativeElement;
    const navbar: Element | null = el.querySelector('app-auth-navbar');
    expect(navbar).toBeTruthy();
  });

  it('should render router-outlet', () => {
    const el: HTMLElement = fixture.nativeElement;
    const outlet: Element | null = el.querySelector('router-outlet');
    expect(outlet).toBeTruthy();
  });

  it('should render app-bottom-nav component', () => {
    const el: HTMLElement = fixture.nativeElement;
    const bottomNav: Element | null = el.querySelector('app-bottom-nav');
    expect(bottomNav).toBeTruthy();
  });

  it('should render footer with current year', () => {
    const el: HTMLElement = fixture.nativeElement;
    const footer: HTMLElement | null = el.querySelector('.app__footer');
    expect(footer).toBeTruthy();
    expect(footer?.textContent).toContain(new Date().getFullYear().toString());
  });

  it('should render footer brand name', () => {
    const el: HTMLElement = fixture.nativeElement;
    const brand: HTMLElement | null = el.querySelector('.app__footer-brand');
    expect(brand?.textContent).toContain('Memlo');
  });

  it('should render terms link in footer', () => {
    const el: HTMLElement = fixture.nativeElement;
    const termsLink: HTMLAnchorElement | null = el.querySelector('a[routerLink="/terms"]');
    expect(termsLink).toBeTruthy();
  });

  it('should render privacy link in footer', () => {
    const el: HTMLElement = fixture.nativeElement;
    const privacyLink: HTMLAnchorElement | null = el.querySelector('a[routerLink="/privacy"]');
    expect(privacyLink).toBeTruthy();
  });

  it('should render onboarding component', () => {
    const el: HTMLElement = fixture.nativeElement;
    const onboarding: Element | null = el.querySelector('app-onboarding');
    expect(onboarding).toBeTruthy();
  });

  it('should render toast component', () => {
    const el: HTMLElement = fixture.nativeElement;
    const toast: Element | null = el.querySelector('app-toast');
    expect(toast).toBeTruthy();
  });
});
