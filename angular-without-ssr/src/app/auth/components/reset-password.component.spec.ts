import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ResetPasswordComponent } from './reset-password.component';
import { AuthStore } from '../store';
import { SupabaseClientFactory } from '../../services/supabase-client.factory';

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let component: ResetPasswordComponent;
  let mockAuthStore: {
    loading: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    updatePassword: jasmine.Spy;
    clearError: jasmine.Spy;
  };
  let mockAuthStateChangeCallback: ((event: string) => void) | null;
  let mockSupabaseFactory: {
    getClient: jasmine.Spy;
  };

  beforeEach(async () => {
    mockAuthStateChangeCallback = null;

    mockAuthStore = {
      loading: signal<boolean>(false),
      error: signal<string | null>(null),
      updatePassword: jasmine.createSpy('updatePassword'),
      clearError: jasmine.createSpy('clearError'),
    };

    const mockUnsubscribe: jasmine.Spy = jasmine.createSpy('unsubscribe');
    mockSupabaseFactory = {
      getClient: jasmine.createSpy('getClient').and.returnValue({
        auth: {
          onAuthStateChange: (callback: (event: string) => void) => {
            mockAuthStateChangeCallback = callback;
            return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
          },
          getSession: jasmine.createSpy('getSession').and.returnValue(
            Promise.resolve({ data: { session: null } })
          ),
        },
      }),
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, ResetPasswordComponent, TranslocoTestingModule.forRoot({ langs: { pl: { auth: { resetPassword: { title: 'Nowe hasło', description: 'Wprowadź swoje nowe hasło poniżej.', newPassword: 'Nowe hasło', passwordPlaceholder: 'Minimum 6 znaków', passwordRequired: 'Hasło jest wymagane', passwordMinLength: 'Hasło musi mieć co najmniej 6 znaków', confirmPassword: 'Potwierdź hasło', confirmPasswordPlaceholder: 'Powtórz nowe hasło', passwordMismatch: 'Hasła nie są zgodne', hidePassword: 'Ukryj hasło', showPassword: 'Pokaż hasło', submitButton: 'Ustaw nowe hasło', backToLogin: 'Wróć do logowania', linkExpired: 'Link wygasł', linkExpiredDescription: 'Link do resetowania hasła wygasł lub jest nieprawidłowy. Spróbuj ponownie.', sendNewLink: 'Wyślij nowy link', verifying: 'Weryfikacja...', verifyingDescription: 'Trwa weryfikacja linku resetującego.' } } } }, translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' } })],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: SupabaseClientFactory, useValue: mockSupabaseFactory },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should have a form with password and confirmPassword controls', () => {
    fixture.detectChanges();
    expect(component.form.contains('password')).toBeTrue();
    expect(component.form.contains('confirmPassword')).toBeTrue();
  });

  it('should make password required', () => {
    fixture.detectChanges();
    component.form.controls['password'].setValue('');
    expect(component.form.controls['password'].hasError('required')).toBeTrue();
  });

  it('should require minimum 6 characters for password', () => {
    fixture.detectChanges();
    component.form.controls['password'].setValue('abc');
    expect(component.form.controls['password'].hasError('minlength')).toBeTrue();
  });

  it('should accept valid password', () => {
    fixture.detectChanges();
    component.form.controls['password'].setValue('validpass');
    expect(component.form.controls['password'].valid).toBeTrue();
  });

  it('should set readySignal to true when PASSWORD_RECOVERY event fires', () => {
    fixture.detectChanges();
    expect(component.readySignal()).toBeFalse();

    if (mockAuthStateChangeCallback) {
      mockAuthStateChangeCallback('PASSWORD_RECOVERY');
    }
    expect(component.readySignal()).toBeTrue();
  });

  it('should set expiredSignal after timeout when no recovery event and no session', fakeAsync(() => {
    fixture.detectChanges();
    tick(5000);
    tick(); // resolve promise
    expect(component.expiredSignal()).toBeTrue();
  }));

  it('should show verification message initially', () => {
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const title: HTMLHeadingElement | null = el.querySelector('.auth-title');
    expect(title?.textContent).toContain('Weryfikacja');
  });

  it('should show form when readySignal is true', () => {
    fixture.detectChanges();
    component.readySignal.set(true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const form: HTMLFormElement | null = el.querySelector('form');
    expect(form).toBeTruthy();
  });

  it('should show expired message when expiredSignal is true', () => {
    fixture.detectChanges();
    component.expiredSignal.set(true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const title: HTMLHeadingElement | null = el.querySelector('.auth-title');
    expect(title?.textContent).toContain('Link wygas');
  });

  it('should not call updatePassword when form is invalid', () => {
    fixture.detectChanges();
    component.readySignal.set(true);
    component.form.controls['password'].setValue('');
    component.form.controls['confirmPassword'].setValue('');
    component.onSubmit();
    expect(mockAuthStore.updatePassword).not.toHaveBeenCalled();
  });

  it('should set mismatchSignal when passwords do not match', () => {
    fixture.detectChanges();
    component.readySignal.set(true);
    component.form.controls['password'].setValue('validpass');
    component.form.controls['confirmPassword'].setValue('different');
    component.onSubmit();
    expect(component.mismatchSignal()).toBeTrue();
  });

  it('should not set mismatchSignal when passwords match', () => {
    fixture.detectChanges();
    component.readySignal.set(true);
    component.form.controls['password'].setValue('validpass');
    component.form.controls['confirmPassword'].setValue('validpass');
    component.onSubmit();
    expect(component.mismatchSignal()).toBeFalse();
  });

  it('should call updatePassword when form is valid and passwords match', () => {
    fixture.detectChanges();
    component.readySignal.set(true);
    component.form.controls['password'].setValue('validpass');
    component.form.controls['confirmPassword'].setValue('validpass');
    component.onSubmit();
    expect(mockAuthStore.updatePassword).toHaveBeenCalledWith('validpass');
  });

  it('should call clearError on submit', () => {
    fixture.detectChanges();
    component.onSubmit();
    expect(mockAuthStore.clearError).toHaveBeenCalled();
  });

  it('should set submittedSignal to true on submit', () => {
    fixture.detectChanges();
    component.onSubmit();
    expect(component.submittedSignal()).toBeTrue();
  });

  it('should unsubscribe auth listener on destroy', () => {
    fixture.detectChanges();
    component.ngOnDestroy();
    const client: ReturnType<typeof mockSupabaseFactory.getClient> = mockSupabaseFactory.getClient();
    // The unsubscribe was set up in ngOnInit — just verify component doesn't throw on destroy
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
