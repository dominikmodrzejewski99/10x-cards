export interface ClassifiedError {
  message: string;
  isAuthError: boolean;
}

export function classifyError(error: unknown, action: string): ClassifiedError {
  if (!navigator.onLine) {
    return {
      message: 'Brak połączenia z internetem. Sprawdź sieć i spróbuj ponownie.',
      isAuthError: false
    };
  }

  const err: { status?: number; message?: string } = error as { status?: number; message?: string };

  if (err.status === 401 || err.message?.includes('nie jest zalogowany') || err.message?.includes('Sesja wygasła')) {
    return {
      message: 'Sesja wygasła. Zaloguj się ponownie.',
      isAuthError: true
    };
  }

  if (err.status === 403) {
    return {
      message: 'Brak uprawnień do wykonania tej operacji.',
      isAuthError: false
    };
  }

  if (err.status && err.status >= 500) {
    return {
      message: `Błąd serwera podczas ${action}. Spróbuj ponownie później.`,
      isAuthError: false
    };
  }

  return {
    message: `Nie udało się ${action}. Spróbuj ponownie.`,
    isAuthError: false
  };
}
