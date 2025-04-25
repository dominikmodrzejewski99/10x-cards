import { HttpInterceptorFn } from '@angular/common/http';
import { SupabaseClient } from '@supabase/supabase-js';
import { from, Observable, switchMap } from 'rxjs';
import { inject } from '@angular/core';
import { SupabaseClientFactory } from './supabase-client.factory';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Tworzymy klienta Supabase używając fabryki
  const supabaseFactory = inject(SupabaseClientFactory);
  const supabase: SupabaseClient = supabaseFactory.createClient();

  // Pobieramy sesję użytkownika i konwertujemy Promise na Observable
  return from(supabase.auth.getSession()).pipe(
    switchMap(({ data }: { data: any }) => {
      // Jeśli mamy token, dodajemy go do nagłówków
      if (data.session?.access_token) {
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${data.session.access_token}`
          }
        });

        return next(authReq);
      }

      // Jeśli nie ma tokenu, kontynuujemy bez modyfikacji
      return next(req);
    })
  );
};
