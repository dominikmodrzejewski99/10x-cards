import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthStore } from '../store';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let component: ForgotPasswordComponent;
  let mockAuthStore: {
    loading: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    resetPassword: jasmine.Spy;
    clearError: jasmine.Spy;
  };

  beforeEach(async () => {
    mockAuthStore = {
      loading: signal<boolean>(false),
      error: signal<string | null>(null),
      resetPassword: jasmine.createSpy('resetPassword'),
      clearError: jasmine.createSpy('clearError'),
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, ForgotPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form with email control', () => {
    expect(component.form.contains('email')).toBeTrue();
  });

  it('should make email required', () => {
    component.form.controls['email'].setValue('');
    expect(component.form.controls['email'].hasError('required')).toBeTrue();
  });

  it('should validate email format', () => {
    component.form.controls['email'].setValue('invalid');
    expect(component.form.controls['email'].hasError('email')).toBeTrue();
  });

  it('should accept valid email', () => {
    component.form.controls['email'].setValue('test@example.com');
    expect(component.form.controls['email'].valid).toBeTrue();
  });

  it('should not call resetPassword on submit when form is invalid', () => {
    component.form.controls['email'].setValue('');
    component.onSubmit();
    expect(mockAuthStore.resetPassword).not.toHaveBeenCalled();
  });

  it('should set submittedSignal to true on submit', () => {
    component.onSubmit();
    expect(component.submittedSignal()).toBeTrue();
  });

  it('should call clearError on submit', () => {
    component.onSubmit();
    expect(mockAuthStore.clearError).toHaveBeenCalled();
  });

  it('should call resetPassword with email when form is valid', () => {
    component.form.controls['email'].setValue('test@example.com');
    component.onSubmit();
    expect(mockAuthStore.resetPassword).toHaveBeenCalledWith('test@example.com');
  });

  it('should set sentEmailSignal when form is valid', () => {
    component.form.controls['email'].setValue('test@example.com');
    component.onSubmit();
    expect(component.sentEmailSignal()).toBe('test@example.com');
  });

  it('should show sentSignal after timeout when no error', fakeAsync(() => {
    component.form.controls['email'].setValue('test@example.com');
    component.onSubmit();
    tick(1500);
    expect(component.sentSignal()).toBeTrue();
  }));

  it('should not show sentSignal after timeout when there is an error', fakeAsync(() => {
    mockAuthStore.error.set('Something went wrong');
    component.form.controls['email'].setValue('test@example.com');
    component.onSubmit();
    tick(1500);
    expect(component.sentSignal()).toBeFalse();
  }));

  it('should render the title', () => {
    const el: HTMLElement = fixture.nativeElement;
    const title: HTMLHeadingElement | null = el.querySelector('.auth-title');
    expect(title?.textContent).toContain('Resetuj has');
  });

  it('should render email input', () => {
    const el: HTMLElement = fixture.nativeElement;
    const input: HTMLInputElement | null = el.querySelector('input#email');
    expect(input).toBeTruthy();
  });

  it('should show validation error when submitted with empty email', () => {
    component.form.controls['email'].setValue('');
    component.onSubmit();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const error: HTMLElement | null = el.querySelector('.auth-error');
    expect(error).toBeTruthy();
  });

  it('should render success message when sentSignal is true', () => {
    component.sentSignal.set(true);
    component.sentEmailSignal.set('test@example.com');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const success: HTMLElement | null = el.querySelector('.auth-success');
    expect(success).toBeTruthy();
    expect(success?.textContent).toContain('test@example.com');
  });

  it('should disable submit button when loading', () => {
    mockAuthStore.loading.set(true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const btn: HTMLButtonElement | null = el.querySelector('button[type="submit"]');
    expect(btn?.disabled).toBeTrue();
  });

  it('should show error message when errorSignal has value', () => {
    mockAuthStore.error.set('Network error');
    component.submittedSignal.set(true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const errorEl: HTMLElement | null = el.querySelector('.auth-error--global');
    expect(errorEl?.textContent).toContain('Network error');
  });
});
