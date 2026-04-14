export interface ClassifiedError {
  messageKey: string;
  messageParams?: Record<string, string>;
  isAuthError: boolean;
}

/**
 * Classifies an HTTP/API error and returns a translation key
 * instead of a hardcoded message. The caller is responsible for
 * translating the key via TranslocoService.
 *
 * @param action - already-translated action description for interpolation
 */
export function classifyError(error: unknown, action: string): ClassifiedError {
  if (!navigator.onLine) {
    return {
      messageKey: 'errors.offline',
      isAuthError: false
    };
  }

  const err: { status?: number; message?: string } = error as { status?: number; message?: string };

  if (err.status === 401 || err.message?.includes('nie jest zalogowany') || err.message?.includes('Sesja wygasła')) {
    return {
      messageKey: 'errors.sessionExpired',
      isAuthError: true
    };
  }

  if (err.status === 403) {
    return {
      messageKey: 'errors.forbidden',
      isAuthError: false
    };
  }

  if (err.status && err.status >= 500) {
    return {
      messageKey: 'errors.serverError',
      messageParams: { action },
      isAuthError: false
    };
  }

  return {
    messageKey: 'errors.actionFailed',
    messageParams: { action },
    isAuthError: false
  };
}
