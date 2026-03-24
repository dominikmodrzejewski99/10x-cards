import { HttpInterceptorFn } from '@angular/common/http';
import { SupabaseClient } from '@supabase/supabase-js';
import { from, switchMap, tap } from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseClientFactory } from './supabase-client.factory';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Pomijamy żądania do OpenRouter API
  if (req.url.includes('openrouter.ai')) {
    return next(req);
  }

  // Tworzymy klienta Supabase używając fabryki
  const supabaseFactory = inject(SupabaseClientFactory);
  const supabase: SupabaseClient = supabaseFactory.getClient();
  const router = inject(Router);

  // Pobieramy sesję użytkownika i konwertujemy Promise na Observable
  return from(supabase.auth.getSession()).pipe(
    switchMap(({ data }: { data: { session: { access_token: string } | null } }) => {
      // Jeśli mamy token, dodajemy go do nagłówków
      if (data.session?.access_token) {
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${data.session.access_token}`
          }
        });

        return next(authReq).pipe(
          tap({
            error: (error) => {
              if (error.status === 401) {
                supabase.auth.signOut();
                router.navigate(['/login']);
              }
            }
          })
        );
      }

      // Jeśli nie ma tokenu, kontynuujemy bez modyfikacji
      return next(req);
    })
  );
};
