import { HttpInterceptorFn } from '@angular/common/http';
import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environments';
import { from, Observable, switchMap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Tworzymy klienta Supabase
  const supabase: SupabaseClient = createBrowserClient(
    environment.supabaseUrl, 
    environment.supabaseKey, 
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    }
  );
  
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