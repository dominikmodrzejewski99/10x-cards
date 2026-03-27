import { HttpInterceptorFn } from '@angular/common/http';
import { SupabaseClient } from '@supabase/supabase-js';
import { from, switchMap, tap } from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseClientFactory } from './supabase-client.factory';

let isLoggingOut = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('openrouter.ai')) {
    return next(req);
  }

  const supabaseFactory = inject(SupabaseClientFactory);
  const supabase: SupabaseClient = supabaseFactory.getClient();
  const router = inject(Router);

  return from(supabase.auth.getSession()).pipe(
    switchMap(({ data }: { data: { session: { access_token: string } | null } }) => {
      if (data.session?.access_token) {
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${data.session.access_token}`
          }
        });

        return next(authReq).pipe(
          tap({
            error: (error) => {
              if (error.status === 401 && !isLoggingOut) {
                isLoggingOut = true;
                supabase.auth.signOut().finally(() => {
                  isLoggingOut = false;
                });
                router.navigate(['/login']);
              }
            }
          })
        );
      }

      return next(req);
    })
  );
};
