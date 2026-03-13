import { Injectable } from '@angular/core';
import { Observable, from, map, switchMap, throwError } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from './supabase-client.factory';
import { environment } from '../../environments/environments';

const BUCKET_NAME: string = 'flashcard-images';
const MAX_FILE_SIZE: number = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  private supabase: SupabaseClient;

  constructor(private supabaseFactory: SupabaseClientFactory) {
    this.supabase = this.supabaseFactory.getClient();
  }

  public uploadImage(file: File): Observable<string> {
    const validationError: string | null = this.validateFile(file);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    return from(this.supabase.auth.getSession()).pipe(
      switchMap(response => {
        if (response.error || !response.data.session) {
          return throwError(() => new Error('Użytkownik nie jest zalogowany'));
        }

        const userId: string = response.data.session.user.id;
        const ext: string = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName: string = `${userId}/${crypto.randomUUID()}.${ext}`;

        return from(this.supabase.storage.from(BUCKET_NAME).upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })).pipe(
          map(uploadResponse => {
            if (uploadResponse.error) {
              throw new Error(`Błąd uploadu: ${uploadResponse.error.message}`);
            }

            const publicUrl: string = `${environment.supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;
            return publicUrl;
          })
        );
      })
    );
  }

  public deleteImage(url: string): Observable<void> {
    const path: string | null = this.extractPathFromUrl(url);
    if (!path) {
      return throwError(() => new Error('Nieprawidłowy URL obrazka'));
    }

    return from(this.supabase.storage.from(BUCKET_NAME).remove([path])).pipe(
      map(response => {
        if (response.error) {
          throw new Error(`Błąd usuwania: ${response.error.message}`);
        }
      })
    );
  }

  public validateFile(file: File): string | null {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return 'Dozwolone formaty: JPEG, PNG, WebP, GIF';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Maksymalny rozmiar pliku to 2MB';
    }
    return null;
  }

  private extractPathFromUrl(url: string): string | null {
    const marker: string = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const index: number = url.indexOf(marker);
    if (index === -1) {
      return null;
    }
    return url.substring(index + marker.length);
  }
}
