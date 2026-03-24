import { Injectable, isDevMode } from '@angular/core';

export interface LogEntry {
  timestamp: Date;
  level: 'error' | 'warn';
  context: string;
  message: string;
  error?: unknown;
}

const MAX_BUFFER_SIZE: number = 50;

@Injectable({ providedIn: 'root' })
export class LoggerService {
  private buffer: LogEntry[] = [];

  public error(context: string, error: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'error',
      context,
      message: this.extractMessage(error),
      error,
    };

    this.addToBuffer(entry);

    if (isDevMode()) {
      console.error(`[${context}]`, error);
    }
  }

  public warn(context: string, message: string): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'warn',
      context,
      message,
    };

    this.addToBuffer(entry);

    if (isDevMode()) {
      console.warn(`[${context}]`, message);
    }
  }

  public getRecentLogs(): ReadonlyArray<LogEntry> {
    return [...this.buffer];
  }

  public clearLogs(): void {
    this.buffer = [];
  }

  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object' && error !== null) {
      const err: Record<string, unknown> = error as Record<string, unknown>;
      if (typeof err['message'] === 'string') {
        return err['message'];
      }
    }
    return 'Unknown error';
  }
}
