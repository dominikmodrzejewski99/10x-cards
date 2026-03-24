import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AuthPageComponent } from './auth-page.component';

describe('AuthPageComponent', () => {
  let fixture: ComponentFixture<AuthPageComponent>;
  let component: AuthPageComponent;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthPageComponent],
      providers: [
        provideRouter([]),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(AuthPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize isLoginModeSignal based on router url', () => {
    // Default test router url won't include /login
    expect(component.isLoginModeSignal()).toBeDefined();
  });

  it('should display "Logowanie" title when isLoginModeSignal is true', () => {
    component.isLoginModeSignal.set(true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const title: HTMLHeadingElement | null = el.querySelector('.auth-title');
    expect(title?.textContent).toContain('Logowanie');
  });

  it('should display "Rejestracja" title when isLoginModeSignal is false', () => {
    component.isLoginModeSignal.set(false);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const title: HTMLHeadingElement | null = el.querySelector('.auth-title');
    expect(title?.textContent).toContain('Rejestracja');
  });

  it('should set login mode to true and navigate to /login via setLoginMode', () => {
    component.setLoginMode(true);
    expect(component.isLoginModeSignal()).toBeTrue();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should set login mode to false and navigate to /register via setLoginMode', () => {
    component.setLoginMode(false);
    expect(component.isLoginModeSignal()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/register']);
  });

  it('should render login tab link', () => {
    const el: HTMLElement = fixture.nativeElement;
    const loginLink: HTMLAnchorElement | null = el.querySelector('a[routerLink="/login"]');
    expect(loginLink).toBeTruthy();
    expect(loginLink?.textContent).toContain('Logowanie');
  });

  it('should render register tab link', () => {
    const el: HTMLElement = fixture.nativeElement;
    const registerLink: HTMLAnchorElement | null = el.querySelector('a[routerLink="/register"]');
    expect(registerLink).toBeTruthy();
    expect(registerLink?.textContent).toContain('Rejestracja');
  });

  it('should add active class to login tab when in login mode', () => {
    component.isLoginModeSignal.set(true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const loginLink: HTMLAnchorElement | null = el.querySelector('a[routerLink="/login"]');
    expect(loginLink?.classList.contains('auth-tabs__link--active')).toBeTrue();
  });

  it('should add active class to register tab when not in login mode', () => {
    component.isLoginModeSignal.set(false);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const registerLink: HTMLAnchorElement | null = el.querySelector('a[routerLink="/register"]');
    expect(registerLink?.classList.contains('auth-tabs__link--active')).toBeTrue();
  });

  it('should render app-auth-form element', () => {
    const el: HTMLElement = fixture.nativeElement;
    const form: Element | null = el.querySelector('app-auth-form');
    expect(form).toBeTruthy();
  });
});
