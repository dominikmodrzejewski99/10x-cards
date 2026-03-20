import { Component, ChangeDetectionStrategy, inject, signal, InputSignal, OutputEmitterRef, WritableSignal, Signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import * as AuthActions from './store/auth.actions';
import { selectAuthError, selectAuthLoading } from './store';
import { input, output } from '@angular/core';

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
  private store: Store = inject(Store);
  private router: Router = inject(Router);

  public loadingSignal: Signal<boolean> = toSignal(this.store.select(selectAuthLoading), { initialValue: false });
  public errorSignal: Signal<string | null> = toSignal(this.store.select(selectAuthError), { initialValue: null });
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
    this.store.dispatch(AuthActions.clearAuthError());

    if (this.authForm.invalid) {
      return;
    }

    const { email, password } = this.authForm.value;

    if (this.isLoginMode()) {
      this.store.dispatch(AuthActions.login({ email, password }));
    } else {
      this.store.dispatch(AuthActions.register({
        email,
        password,
        passwordConfirmation: password
      }));
    }
  }

  public onAnonymousLogin(): void {
    this.store.dispatch(AuthActions.clearAuthError());
    this.store.dispatch(AuthActions.loginAnonymously());
  }
}
