import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AdminPayoutsService } from '../../services/api/admin-payouts.service';

export const adminGuard: CanActivateFn = () => {
  const adminService = inject(AdminPayoutsService);
  const router: Router = inject(Router);

  return adminService.isAdmin().pipe(
    map((isAdmin: boolean) => {
      if (isAdmin) return true;
      return router.createUrlTree(['/dashboard']);
    }),
    catchError(() => of(router.createUrlTree(['/dashboard'])))
  );
};
