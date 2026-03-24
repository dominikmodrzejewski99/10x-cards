import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { signal, WritableSignal, Component } from '@angular/core';
import { AuthFormComponent } from './auth-form.component';
import { AuthStore } from './store';

// Minimal host component to pass signal inputs
@Component({
  template: `<app-auth-form [isLoginMode]="loginMode" (modeChange)="onModeChange($event)" />`,
  imports: [AuthFormComponent],
})
class TestHostComponent {
  public loginMode = true;
  public lastModeChange: boolean | undefined;
  public onModeChange(mode: boolean): void {
    this.lastModeChange = mode;
  }
}

describe('AuthFormComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;
  let component: AuthFormComponent;
  let router: Router;
  let mockAuthStore: {
    loading: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    login: jasmine.Spy;
    register: jasmine.Spy;
    loginAnonymously: jasmine.Spy;
    clearError: jasmine.Spy;
  };

  beforeEach(async () => {
    mockAuthStore = {
      loading: signal<boolean>(false),
      error: signal<string | null>(null),
      login: jasmine.createSpy('login'),
      register: jasmine.createSpy('register'),
      loginAnonymously: jasmine.createSpy('loginAnonymously'),
      clearError: jasmine.createSpy('clearError'),
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, AuthFormComponent, TestHostComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();

    // Get the AuthFormComponent instance from the host
    const authFormDebug = fixture.debugElement.children[0];
    component = authFormDebug.componentInstance as AuthFormComponent;
  });

  describe('form validation', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should have an invalid form when empty', () => {
      expect(component.authForm.valid).toBeFalse();
    });

    it('should require email', () => {
      component.authForm.controls['email'].setValue('');
      expect(component.authForm.controls['email'].hasError('required')).toBeTrue();
    });

    it('should validate email format', () => {
      component.authForm.controls['email'].setValue('not-an-email');
      expect(component.authForm.controls['email'].hasError('email')).toBeTrue();
    });

    it('should accept valid email', () => {
      component.authForm.controls['email'].setValue('test@example.com');
      expect(component.authForm.controls['email'].valid).toBeTrue();
    });

    it('should require password', () => {
      component.authForm.controls['password'].setValue('');
      expect(component.authForm.controls['password'].hasError('required')).toBeTrue();
    });

    it('should require password minimum length of 6', () => {
      component.authForm.controls['password'].setValue('12345');
      expect(component.authForm.controls['password'].hasError('minlength')).toBeTrue();
    });

    it('should accept password with 6+ characters', () => {
      component.authForm.controls['password'].setValue('123456');
      expect(component.authForm.controls['password'].valid).toBeTrue();
    });

    it('should be valid when both fields are correct', () => {
      component.authForm.controls['email'].setValue('test@example.com');
      component.authForm.controls['password'].setValue('password123');
      expect(component.authForm.valid).toBeTrue();
    });
  });

  describe('onSubmit', () => {
    it('should not call store when form is invalid', () => {
      component.onSubmit();
      expect(mockAuthStore.login).not.toHaveBeenCalled();
      expect(mockAuthStore.register).not.toHaveBeenCalled();
      expect(component.submittedSignal()).toBeTrue();
    });

    it('should call store.login in login mode', () => {
      component.authForm.controls['email'].setValue('test@example.com');
      component.authForm.controls['password'].setValue('password123');

      component.onSubmit();

      expect(mockAuthStore.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should call store.register in register mode', () => {
      hostComponent.loginMode = false;
      fixture.detectChanges();

      component.authForm.controls['email'].setValue('test@example.com');
      component.authForm.controls['password'].setValue('password123');

      component.onSubmit();

      expect(mockAuthStore.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        passwordConfirmation: 'password123',
      });
    });

    it('should clear error before submit', () => {
      component.authForm.controls['email'].setValue('test@example.com');
      component.authForm.controls['password'].setValue('password123');

      component.onSubmit();

      expect(mockAuthStore.clearError).toHaveBeenCalled();
    });
  });

  describe('password toggle', () => {
    it('should default to hidden password', () => {
      expect(component.showPasswordSignal()).toBeFalse();
    });

    it('should toggle password visibility', () => {
      component.showPasswordSignal.set(true);
      expect(component.showPasswordSignal()).toBeTrue();

      component.showPasswordSignal.set(false);
      expect(component.showPasswordSignal()).toBeFalse();
    });

    it('should render password input type based on signal', () => {
      fixture.detectChanges();
      const passwordInput: HTMLInputElement = fixture.nativeElement.querySelector('#password');
      expect(passwordInput.type).toBe('password');

      component.showPasswordSignal.set(true);
      fixture.detectChanges();
      expect(passwordInput.type).toBe('text');
    });
  });

  describe('error display', () => {
    it('should not show error when errorSignal is null', () => {
      fixture.detectChanges();
      const errorEl: HTMLElement | null = fixture.nativeElement.querySelector('[role="alert"]');
      expect(errorEl).toBeNull();
    });

    it('should show error when errorSignal has value', () => {
      (mockAuthStore.error as WritableSignal<string | null>).set('Test error message');
      fixture.detectChanges();
      const errorEl: HTMLElement | null = fixture.nativeElement.querySelector('[role="alert"]');
      expect(errorEl).toBeTruthy();
      expect(errorEl!.textContent).toContain('Test error message');
    });
  });

  describe('anonymous login', () => {
    it('should call store.loginAnonymously and clearError', () => {
      component.onAnonymousLogin();
      expect(mockAuthStore.clearError).toHaveBeenCalled();
      expect(mockAuthStore.loginAnonymously).toHaveBeenCalled();
    });
  });

  describe('validation errors display in template', () => {
    it('should show email required error after submit with empty email', () => {
      component.onSubmit();
      fixture.detectChanges();

      const errorSpans: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.auth-form__error span');
      const texts: string[] = Array.from(errorSpans).map((el: HTMLElement) => el.textContent?.trim() ?? '');
      expect(texts).toContain('Email jest wymagany');
    });

    it('should show password required error after submit with empty password', () => {
      component.onSubmit();
      fixture.detectChanges();

      const errorSpans: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.auth-form__error span');
      const texts: string[] = Array.from(errorSpans).map((el: HTMLElement) => el.textContent?.trim() ?? '');
      expect(texts).toContain('Hasło jest wymagane');
    });

    it('should show password minlength error', () => {
      component.authForm.controls['email'].setValue('test@example.com');
      component.authForm.controls['password'].setValue('123');
      component.onSubmit();
      fixture.detectChanges();

      const errorSpans: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.auth-form__error span');
      const texts: string[] = Array.from(errorSpans).map((el: HTMLElement) => el.textContent?.trim() ?? '');
      expect(texts).toContain('Hasło musi mieć co najmniej 6 znaków');
    });
  });
});
