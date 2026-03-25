import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { AuthService } from '../auth.service';

export function emailExistsValidator(authService: AuthService): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const value: string = control.value?.trim();

    if (!value) {
      return of(null);
    }

    return timer(500).pipe(
      switchMap(() => authService.checkEmailExists(value)),
      map((exists: boolean) => (exists ? { emailExists: true } : null)),
      catchError(() => of(null))
    );
  };
}
