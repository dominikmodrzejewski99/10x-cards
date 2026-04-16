/**
 * Typed error with an HTTP-like status code.
 * Used by API services so that facades and error classifiers
 * can branch on `err.status` instead of matching message strings.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}
