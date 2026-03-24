import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { Subject } from 'rxjs';
import { UserMenuComponent } from './user-menu.component';
import { AuthStore } from '../store';
import { UserDTO } from '../../../types';

describe('UserMenuComponent', () => {
  let fixture: ComponentFixture<UserMenuComponent>;
  let component: UserMenuComponent;
  let mockAuthStore: {
    isAuthenticated: WritableSignal<boolean>;
    user: WritableSignal<UserDTO | null>;
    logout: jasmine.Spy;
    deleteAccount: jasmine.Spy;
  };
  let mockConfirmationService: jasmine.SpyObj<ConfirmationService> & { requireConfirmation$: Subject<unknown> };

  const mockUser: UserDTO = {
    id: 'user-1',
    email: 'test@example.com',
    is_anonymous: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    mockAuthStore = {
      isAuthenticated: signal<boolean>(true),
      user: signal<UserDTO | null>(mockUser),
      logout: jasmine.createSpy('logout'),
      deleteAccount: jasmine.createSpy('deleteAccount'),
    };

    mockConfirmationService = {
      ...jasmine.createSpyObj<ConfirmationService>('ConfirmationService', ['confirm']),
      requireConfirmation$: new Subject<unknown>(),
    } as jasmine.SpyObj<ConfirmationService> & { requireConfirmation$: Subject<unknown> };

    await TestBed.configureTestingModule({
      imports: [UserMenuComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .overrideComponent(UserMenuComponent, {
      set: {
        providers: [{ provide: ConfirmationService, useValue: mockConfirmationService }],
      },
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute user initials from email', () => {
    expect(component.userInitialsSignal()).toBe('T');
  });

  it('should return "?" when user has no email', () => {
    mockAuthStore.user.set({ ...mockUser, email: '' });
    expect(component.userInitialsSignal()).toBe('?');
  });

  it('should return "?" when user is null', () => {
    mockAuthStore.user.set(null);
    expect(component.userInitialsSignal()).toBe('?');
  });

  it('should initialize with menu closed', () => {
    expect(component.isMenuOpenSignal()).toBeFalse();
  });

  it('should toggle menu open and closed', () => {
    component.toggleMenu();
    expect(component.isMenuOpenSignal()).toBeTrue();

    component.toggleMenu();
    expect(component.isMenuOpenSignal()).toBeFalse();
  });

  it('should close menu via closeMenu', () => {
    component.isMenuOpenSignal.set(true);
    component.closeMenu();
    expect(component.isMenuOpenSignal()).toBeFalse();
  });

  it('should close menu on escape when menu is open', () => {
    component.isMenuOpenSignal.set(true);
    component.onEscape();
    expect(component.isMenuOpenSignal()).toBeFalse();
  });

  it('should not change menu state on escape when menu is closed', () => {
    component.isMenuOpenSignal.set(false);
    component.onEscape();
    expect(component.isMenuOpenSignal()).toBeFalse();
  });

  it('should call authStore.logout and close menu on logout', () => {
    component.isMenuOpenSignal.set(true);
    component.onLogout();
    expect(mockAuthStore.logout).toHaveBeenCalled();
    expect(component.isMenuOpenSignal()).toBeFalse();
  });

  it('should show confirmation dialog on delete account', () => {
    component.isMenuOpenSignal.set(true);
    component.onDeleteAccount();
    expect(component.isMenuOpenSignal()).toBeFalse();
    expect(mockConfirmationService.confirm).toHaveBeenCalled();
  });

  it('should call deleteAccount when confirmation is accepted', () => {
    component.onDeleteAccount();
    const confirmArgs: Record<string, unknown> = mockConfirmationService.confirm.calls.first().args[0] as Record<string, unknown>;
    const acceptFn: () => void = confirmArgs['accept'] as () => void;
    acceptFn();
    expect(mockAuthStore.deleteAccount).toHaveBeenCalled();
  });

  it('should render user-menu-button when authenticated and not anonymous', () => {
    const el: HTMLElement = fixture.nativeElement;
    const btn: HTMLButtonElement | null = el.querySelector('.user-menu-button');
    expect(btn).toBeTruthy();
  });

  it('should show user email in menu button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const emailSpan: HTMLSpanElement | null = el.querySelector('.user-email');
    expect(emailSpan?.textContent).toContain('test@example.com');
  });

  it('should show logout button for anonymous user', () => {
    mockAuthStore.user.set({ ...mockUser, is_anonymous: true });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const logoutBtn: HTMLButtonElement | null = el.querySelector('.logout-btn');
    expect(logoutBtn).toBeTruthy();
  });

  it('should render dropdown menu when menu is open', () => {
    component.toggleMenu();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const dropdown: HTMLElement | null = el.querySelector('.dropdown-menu');
    expect(dropdown).toBeTruthy();
  });

  it('should not render dropdown menu when menu is closed', () => {
    const el: HTMLElement = fixture.nativeElement;
    const dropdown: HTMLElement | null = el.querySelector('.dropdown-menu');
    expect(dropdown).toBeNull();
  });

  it('should display user avatar with initials', () => {
    const el: HTMLElement = fixture.nativeElement;
    const avatar: HTMLElement | null = el.querySelector('.user-avatar');
    expect(avatar?.textContent?.trim()).toBe('T');
  });
});
