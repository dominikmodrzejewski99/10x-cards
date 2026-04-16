import { Injectable } from '@angular/core';
import { Observable, from, map, switchMap, throwError } from 'rxjs';
import { AppError } from '../../shared/utils/app-error';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from './supabase-client.factory';
import { environment } from '../../../environments/environments';

const BUCKET_NAME: string = 'flashcard-audio';
const MAX_FILE_SIZE: number = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES: string[] = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];

@Injectable({
  providedIn: 'root'
})
export class AudioUploadService {
  private supabase: SupabaseClient;

  constructor(private supabaseFactory: SupabaseClientFactory) {
    this.supabase = this.supabaseFactory.getClient();
  }

  public uploadAudio(file: File): Observable<string> {
    const validationError: string | null = this.validateFile(file);
    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    return from(this.supabase.auth.getSession()).pipe(
      switchMap(response => {
        if (response.error || !response.data.session) {
          return throwError(() => new AppError(401, 'User not authenticated'));
        }

        const userId: string = response.data.session.user.id;
        const ext: string = file.name.split('.').pop()?.toLowerCase() || 'webm';
        const fileName: string = `${userId}/${crypto.randomUUID()}.${ext}`;

        return from(this.supabase.storage.from(BUCKET_NAME).upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })).pipe(
          map(uploadResponse => {
            if (uploadResponse.error) {
              throw new AppError(500, `Upload error: ${uploadResponse.error.message}`);
            }

            const publicUrl: string = `${environment.supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;
            return publicUrl;
          })
        );
      })
    );
  }

  public deleteAudio(url: string): Observable<void> {
    const path: string | null = this.extractPathFromUrl(url);
    if (!path) {
      return throwError(() => new AppError(400, 'Invalid audio file URL'));
    }

    return from(this.supabase.storage.from(BUCKET_NAME).remove([path])).pipe(
      map(response => {
        if (response.error) {
          throw new AppError(500, `Delete error: ${response.error.message}`);
        }
      })
    );
  }

  public validateFile(file: File): string | null {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return 'Dozwolone formaty: MP3, WAV, OGG, WebM';
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
