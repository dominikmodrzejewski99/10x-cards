import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { TranslocoService } from '@jsverse/transloco';
import { SessionManager } from './session-manager.service';
import { LoggerService } from '../infrastructure/logger.service';
import {
  Session,
  Message,
  OpenRouterRequestPayload,
  OpenRouterResponse
} from '../../interfaces/openrouter.interface';
import { Observable, firstValueFrom, timeout, throwError } from 'rxjs';
import { environment } from '../../../environments/environments';
import { SupabaseClientFactory } from '../infrastructure/supabase-client.factory';

export interface SendMessageOptions {
  systemMessage?: string;
  temperature?: number;
  max_tokens?: number;
  model?: string;
  useJsonFormat?: boolean;
}

interface ApiError {
  status: number | null;
  message: string;
  retryable: boolean;
}

const CHAT_FUNCTION_PATH = '/functions/v1/chat';

const FALLBACK_MODELS: readonly string[] = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
] as const;

const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([400, 429, 502, 503, 504]);
const NON_RETRYABLE_STATUSES: ReadonlySet<number> = new Set([401, 403, 404]);

@Injectable({
  providedIn: 'root'
})
export class OpenRouterService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly logger: LoggerService = inject(LoggerService);
  private readonly t: TranslocoService = inject(TranslocoService);
  private readonly sessionManager: SessionManager = inject(SessionManager);
  private readonly supabaseFactory: SupabaseClientFactory = inject(SupabaseClientFactory);

  public readonly defaultModel: string = FALLBACK_MODELS[0];

  public async sendMessage(
    userMessage: string,
    sessionId?: string,
    options?: SendMessageOptions
  ): Promise<string> {
    const session: Session = this.resolveSession(sessionId);

    this.sessionManager.addMessage(session.id, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    const messages: { role: string; content: string }[] = this.buildMessages(session, options);
    const payload: OpenRouterRequestPayload = this.buildPayload(messages, options);
    const response: OpenRouterResponse = await this.callWithFallback(payload);
    const content: string | undefined = response?.choices?.[0]?.message?.content;

    if (!content) {
      this.logger.error('OpenRouterService.sendMessage', 'Empty response from AI model');
      throw new Error(this.t.translate('openrouter.errors.emptyResponseSingle'));
    }

    this.sessionManager.addMessage(session.id, {
      role: 'assistant',
      content,
      timestamp: new Date()
    });

    return content;
  }

  public async translateText(text: string, fromLang: string, toLang: string): Promise<string> {
    const langNames: Record<string, string> = {
      en: 'English', pl: 'Polish', de: 'German', es: 'Spanish', fr: 'French'
    };
    const fromName: string = langNames[fromLang] || fromLang;
    const toName: string = langNames[toLang] || toLang;

    const payload: OpenRouterRequestPayload = {
      model: this.defaultModel,
      messages: [{
        role: 'user',
        content: `Translate "${text}" from ${fromName} to ${toName}. Return ONLY the translation. If there are multiple common meanings, separate them with semicolons. No explanations.`
      }],
      temperature: 0.3,
      max_tokens: 200
    };

    const maxRetries: number = 3;
    for (let attempt: number = 0; attempt < maxRetries; attempt++) {
      try {
        const response: OpenRouterResponse = await this.callWithFallback(payload);
        const content: string | undefined = response?.choices?.[0]?.message?.content?.trim();
        if (content) {
          return content;
        }
      } catch (error: unknown) {
        if (attempt === maxRetries - 1) {
          this.logger.error('OpenRouterService.translateText', error);
          throw new Error(this.t.translate('openrouter.errors.translationFailed'));
        }
      }
    }

    throw new Error(this.t.translate('openrouter.errors.emptyResponse'));
  }

  public createSession(): Session {
    return this.sessionManager.createSession();
  }

  public getSession(sessionId?: string): Session | null {
    return this.sessionManager.getSession(sessionId);
  }

  // --- Private ---

  private resolveSession(sessionId?: string): Session {
    if (sessionId) {
      const existing: Session | null = this.sessionManager.getSession(sessionId);
      if (!existing) {
        throw new Error(this.t.translate('openrouter.errors.sessionNotFound'));
      }
      return existing;
    }
    return this.sessionManager.createSession();
  }

  private buildMessages(
    session: Session,
    options?: SendMessageOptions
  ): { role: string; content: string }[] {
    const messages: { role: string; content: string }[] = session.messages.map(
      (msg: Message) => ({ role: msg.role, content: msg.content })
    );

    // System instruction jako user message — kompatybilne z każdym modelem (Gemma nie obsługuje roli system)
    const systemContent: string = options?.systemMessage || 'Jesteś pomocnym asystentem AI.';
    if (messages.length === 0 || !messages[0].content.startsWith('[System]')) {
      messages.unshift({
        role: 'user',
        content: `[System] ${systemContent}`
      });
    }

    // JSON mode wymuszony w prompcie — nie wszystkie modele obsługują response_format
    if (options?.useJsonFormat) {
      const lastMsg: { role: string; content: string } | undefined = messages[messages.length - 1];
      if (lastMsg && !lastMsg.content.includes('Respond ONLY with valid JSON')) {
        lastMsg.content += '\n\nRespond ONLY with valid JSON. No markdown, no code blocks, no explanation — just raw JSON.';
      }
    }

    return messages;
  }

  private buildPayload(
    messages: { role: string; content: string }[],
    options?: SendMessageOptions
  ): OpenRouterRequestPayload {
    return {
      model: options?.model || this.defaultModel,
      messages,
      temperature: options?.temperature || 0.7,
      max_tokens: options?.max_tokens || 1000
    };
  }

  private async callWithFallback(payload: OpenRouterRequestPayload): Promise<OpenRouterResponse> {
    const models: readonly string[] = FALLBACK_MODELS;

    for (let i = 0; i < models.length; i++) {
      const model: string = models[i];
      const isLast: boolean = i === models.length - 1;

      try {
        const response: OpenRouterResponse = await firstValueFrom(this.callApi({ ...payload, model }));
        this.validateResponse(response);
        return response;
      } catch (error: unknown) {
        const apiError: ApiError = this.classifyError(error);
        this.logger.error('OpenRouterService.callWithFallback', error);

        if (!isLast && apiError.retryable) {
          this.logger.warn(
            'OpenRouterService.callWithFallback',
            `Model ${model} zwrócił błąd (${apiError.status ?? 'network'}): ${apiError.message}. Przełączam na ${models[i + 1]}...`
          );
          continue;
        }

        // Zamieniamy na user-friendly message
        const userMessage: string = error instanceof HttpErrorResponse
          ? this.getErrorMessage(error)
          : (error instanceof Error ? error.message : this.t.translate('openrouter.errors.unknownApiError'));
        throw new Error(userMessage);
      }
    }

    throw new Error(this.t.translate('openrouter.errors.allModelsUnavailable'));
  }

  private callApi(payload: OpenRouterRequestPayload): Observable<OpenRouterResponse> {
    const apiUrl = `${environment.supabaseUrl}${CHAT_FUNCTION_PATH}`;
    const headers: HttpHeaders = new HttpHeaders({
      'Content-Type': 'application/json',
      'apikey': environment.supabaseKey,
    });

    return this.http.post<OpenRouterResponse>(apiUrl, payload, { headers }).pipe(
      timeout({ each: 60_000, with: () => throwError(() => new Error(this.t.translate('openrouter.errors.timeout'))) })
    );
  }

  private validateResponse(response: OpenRouterResponse): void {
    const raw: Record<string, unknown> = response as unknown as Record<string, unknown>;
    if (raw['error']) {
      const errorObj: Record<string, unknown> = raw['error'] as Record<string, unknown>;
      const message: string = (errorObj['message'] as string) || this.t.translate('openrouter.errors.apiResponseError');
      const code: number = (errorObj['code'] as number) || 0;
      const isRetryable: boolean = code === 429 || message.includes('rate-limit');
      const err: Error & { retryable?: boolean } = new Error(message);
      err.retryable = isRetryable;
      throw err;
    }
  }

  private classifyError(error: unknown): ApiError {
    const httpError: HttpErrorResponse | null =
      error instanceof HttpErrorResponse ? error : null;
    const status: number | null = httpError?.status ?? null;
    const message: string = error instanceof Error ? error.message : String(error);

    const isNetwork: boolean = !status && (
      message.includes('Failed to fetch') ||
      message.includes('network error') ||
      message.includes('ERR_NETWORK')
    );
    const isRetryableStatus: boolean = status !== null && RETRYABLE_STATUSES.has(status);
    const isRateLimit: boolean = message.includes('rate-limit') || message.includes('Przekroczono limit');
    const markedRetryable: boolean = (error as { retryable?: boolean })?.retryable === true;

    return {
      status,
      message,
      retryable: isNetwork || isRetryableStatus || isRateLimit || markedRetryable
    };
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.error instanceof ErrorEvent) {
      return this.t.translate('openrouter.errors.networkError', { message: error.error.message });
    }

    const providerMessage: string | undefined = this.extractProviderMessage(error);

    switch (error.status) {
      case 0:
        return this.t.translate('openrouter.errors.noConnection');
      case 400:
        return providerMessage
          ? this.t.translate('openrouter.errors.badRequestWithMessage', { message: providerMessage })
          : this.t.translate('openrouter.errors.badRequest');
      case 401:
        return this.t.translate('openrouter.errors.unauthorized');
      case 403:
        return this.t.translate('openrouter.errors.forbidden');
      case 404:
        return this.t.translate('openrouter.errors.modelNotFound');
      case 429:
        return this.t.translate('openrouter.errors.rateLimited');
      case 500:
      case 502:
      case 503:
      case 504:
        return this.t.translate('openrouter.errors.serverError', { status: error.status });
      default:
        return this.t.translate('openrouter.errors.unexpectedError', {
          status: error.status,
          details: error.statusText || this.t.translate('openrouter.errors.noDetails')
        });
    }
  }

  private extractProviderMessage(error: HttpErrorResponse): string | undefined {
    try {
      const body: unknown = error.error;
      if (typeof body === 'object' && body !== null) {
        const errorObj: Record<string, unknown> = body as Record<string, unknown>;
        const nested: unknown = errorObj['error'];
        if (typeof nested === 'object' && nested !== null) {
          const nestedObj: Record<string, unknown> = nested as Record<string, unknown>;
          if (typeof nestedObj['message'] === 'string') {
            return nestedObj['message'];
          }
          const metadata: unknown = nestedObj['metadata'];
          if (typeof metadata === 'object' && metadata !== null) {
            const raw: unknown = (metadata as Record<string, unknown>)['raw'];
            if (typeof raw === 'string') {
              const parsed: Record<string, unknown> = JSON.parse(raw);
              const innerError: unknown = parsed['error'];
              if (typeof innerError === 'object' && innerError !== null) {
                const msg: unknown = (innerError as Record<string, unknown>)['message'];
                if (typeof msg === 'string') return msg;
              }
            }
          }
        }
      }
    } catch {
      // extraction failed — return undefined
    }
    return undefined;
  }
}
