import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AuthNavbarComponent } from './auth-navbar.component';
import { AuthStore } from '../../auth/store';

describe('AuthNavbarComponent', () => {
  let fixture: ComponentFixture<AuthNavbarComponent>;
  let component: AuthNavbarComponent;
  let mockAuthStore: {
    authChecked: WritableSignal<boolean>;
    isAuthenticated: WritableSignal<boolean>;
    isAnonymous: WritableSignal<boolean>;
  };

  beforeEach(async () => {
    mockAuthStore = {
      authChecked: signal<boolean>(true),
      isAuthenticated: signal<boolean>(false),
      isAnonymous: signal<boolean>(false),
    };

    await TestBed.configureTestingModule({
      imports: [AuthNavbarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthNavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with mobile menu closed', () => {
    expect(component.mobileOpenSignal()).toBeFalse();
  });

  it('should toggle mobile menu', () => {
    component.toggleMobile();
    expect(component.mobileOpenSignal()).toBeTrue();

    component.toggleMobile();
    expect(component.mobileOpenSignal()).toBeFalse();
  });

  it('should close mobile menu via closeMobile', () => {
    component.mobileOpenSignal.set(true);
    component.closeMobile();
    expect(component.mobileOpenSignal()).toBeFalse();
  });

  it('should close mobile menu on escape', () => {
    component.mobileOpenSignal.set(true);
    component.onEscape();
    expect(component.mobileOpenSignal()).toBeFalse();
  });

  it('should close mobile menu when clicking outside', () => {
    component.mobileOpenSignal.set(true);
    const outsideEvent: MouseEvent = new MouseEvent('click');
    Object.defineProperty(outsideEvent, 'target', { value: document.createElement('div') });
    component.onDocumentClick(outsideEvent);
    expect(component.mobileOpenSignal()).toBeFalse();
  });

  it('should not close mobile menu when clicking inside component', () => {
    component.mobileOpenSignal.set(true);
    const insideEvent: MouseEvent = new MouseEvent('click');
    Object.defineProperty(insideEvent, 'target', { value: fixture.nativeElement });
    component.onDocumentClick(insideEvent);
    expect(component.mobileOpenSignal()).toBeTrue();
  });

  it('should not close mobile menu on outside click when menu is already closed', () => {
    component.mobileOpenSignal.set(false);
    const outsideEvent: MouseEvent = new MouseEvent('click');
    Object.defineProperty(outsideEvent, 'target', { value: document.createElement('div') });
    component.onDocumentClick(outsideEvent);
    expect(component.mobileOpenSignal()).toBeFalse();
  });

  it('should render logo', () => {
    const el: HTMLElement = fixture.nativeElement;
    const logo: HTMLAnchorElement | null = el.querySelector('.navbar__logo');
    expect(logo).toBeTruthy();
  });

  it('should show login/register links when not authenticated', () => {
    mockAuthStore.authChecked.set(true);
    mockAuthStore.isAuthenticated.set(false);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const loginBtn: HTMLAnchorElement | null = el.querySelector('.navbar__auth-btn--login');
    const registerBtn: HTMLAnchorElement | null = el.querySelector('.navbar__auth-btn--register');
    expect(loginBtn).toBeTruthy();
    expect(registerBtn).toBeTruthy();
  });

  it('should show desktop navigation links when authenticated', () => {
    mockAuthStore.authChecked.set(true);
    mockAuthStore.isAuthenticated.set(true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const desktopLinks: HTMLElement | null = el.querySelector('.navbar__links--desktop');
    const navLinks: NodeListOf<HTMLAnchorElement> = desktopLinks?.querySelectorAll('.navbar__link') ?? new NodeList() as NodeListOf<HTMLAnchorElement>;
    expect(navLinks.length).toBeGreaterThan(0);
  });

  it('should show burger button when authenticated', () => {
    mockAuthStore.authChecked.set(true);
    mockAuthStore.isAuthenticated.set(true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const burger: HTMLButtonElement | null = el.querySelector('.navbar__burger');
    expect(burger).toBeTruthy();
  });

  it('should show mobile drawer when authenticated and mobile menu is open', () => {
    mockAuthStore.authChecked.set(true);
    mockAuthStore.isAuthenticated.set(true);
    component.mobileOpenSignal.set(true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const drawer: HTMLElement | null = el.querySelector('.navbar__drawer');
    expect(drawer).toBeTruthy();
  });

  it('should not show mobile drawer when mobile menu is closed', () => {
    mockAuthStore.authChecked.set(true);
    mockAuthStore.isAuthenticated.set(true);
    component.mobileOpenSignal.set(false);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const drawer: HTMLElement | null = el.querySelector('.navbar__drawer');
    expect(drawer).toBeNull();
  });

  it('should not show navigation when auth not checked', () => {
    mockAuthStore.authChecked.set(false);
    mockAuthStore.isAuthenticated.set(true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const desktopLinks: HTMLElement | null = el.querySelector('.navbar__links--desktop');
    const navLinks: NodeListOf<HTMLAnchorElement> = desktopLinks?.querySelectorAll('.navbar__link') ?? new NodeList() as NodeListOf<HTMLAnchorElement>;
    expect(navLinks.length).toBe(0);
  });

  it('should expose authStore signals correctly', () => {
    expect(component.authCheckedSignal()).toBeTrue();
    expect(component.isAuthenticatedSignal()).toBeFalse();
    expect(component.isAnonymousSignal()).toBeFalse();
  });
});
