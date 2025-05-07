import { CanActivateFn } from '@angular/router';
import { of } from 'rxjs';

export const partialAuthGuard: CanActivateFn = (route, state) => {
  // Ten guard zawsze zezwala na dostęp, ale komponenty mogą sprawdzać stan autentykacji
  // i dostosowywać swoje zachowanie
  return of(true);
};
