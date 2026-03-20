import { Component, ChangeDetectionStrategy, inject, signal, InputSignal, OutputEmitterRef, WritableSignal, Signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { input, output } from '@angular/core';
import { AuthStore } from './store';

@Component({
  selector: 'app-auth-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './auth-form.component.html',
  styleUrls: ['./auth-form.component.scss']
})
export class AuthFormComponent {
  public isLoginMode: InputSignal<boolean> = input<boolean>(true);
  public modeChange: OutputEmitterRef<boolean> = output<boolean>();

  private fb: FormBuilder = inject(FormBuilder);
  private authStore = inject(AuthStore);
  private router: Router = inject(Router);

  public loadingSignal: Signal<boolean> = this.authStore.loading;
  public errorSignal: Signal<string | null> = this.authStore.error;
  public submittedSignal: WritableSignal<boolean> = signal<boolean>(false);

  public authForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  public get f(): Record<string, import('@angular/forms').AbstractControl> {
    return this.authForm.controls;
  }

  public toggleAuthMode(): void {
    const newMode: boolean = !this.isLoginMode();
    this.modeChange.emit(newMode);
    this.submittedSignal.set(false);
    this.authForm.reset();

    const targetPath: string = newMode ? '/login' : '/register';
    this.router.navigate([targetPath]);
  }

  public onSubmit(): void {
    this.submittedSignal.set(true);
    this.authStore.clearError();

    if (this.authForm.invalid) {
      return;
    }

    const { email, password } = this.authForm.value;

    if (this.isLoginMode()) {
      this.authStore.login({ email, password });
    } else {
      this.authStore.register({
        email,
        password,
        passwordConfirmation: password
      });
    }
  }

  public onAnonymousLogin(): void {
    this.authStore.clearError();
    this.authStore.loginAnonymously();
  }
}
