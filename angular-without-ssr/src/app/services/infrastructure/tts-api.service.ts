import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError, timeout } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { environment } from '../../../environments/environments';
import { AppError } from '../../shared/utils/app-error';
import { FlashcardLanguage } from '../../../types';
import { LoggerService } from './logger.service';

const TTS_FUNCTION_PATH = '/functions/v1/tts';
const TTS_MAX_TEXT_LENGTH = 500;
const TTS_TIMEOUT_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class TtsApiService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly t: TranslocoService = inject(TranslocoService);
  private readonly logger: LoggerService = inject(LoggerService);

  public get maxTextLength(): number {
    return TTS_MAX_TEXT_LENGTH;
  }

  public generateAudio(text: string, _lang: FlashcardLanguage | null): Observable<Blob> {
    const trimmed: string = text.trim();
    if (!trimmed) {
      return throwError(() => new AppError(400, this.t.translate('flashcardForm.tts.errors.empty')));
    }
    if (trimmed.length > TTS_MAX_TEXT_LENGTH) {
      return throwError(() => new AppError(
        400,
        this.t.translate('flashcardForm.tts.errors.tooLong', { max: TTS_MAX_TEXT_LENGTH })
      ));
    }

    const url: string = `${environment.supabaseUrl}${TTS_FUNCTION_PATH}`;
    const headers: HttpHeaders = new HttpHeaders({
      'Content-Type': 'application/json',
      'apikey': environment.supabaseKey,
    });

    return this.http.post(url, { text: trimmed }, { headers, responseType: 'blob' }).pipe(
      timeout({
        each: TTS_TIMEOUT_MS,
        with: () => throwError(() => new AppError(504, this.t.translate('flashcardForm.tts.errors.timeout')))
      }),
      catchError((err: unknown) => {
        this.logger.error('TtsApiService.generateAudio', err);
        if (err instanceof AppError) {
          return throwError(() => err);
        }
        const status: number = err instanceof HttpErrorResponse ? err.status : 500;
        return throwError(() => new AppError(
          status,
          this.t.translate('flashcardForm.tts.errors.failed')
        ));
      })
    );
  }
}
