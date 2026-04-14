import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { ToastService } from '../../shared/services/toast.service';
import { GlobalErrorHandler } from './global-error-handler';
import { SentryService } from './sentry.service';

describe('GlobalErrorHandler', () => {
  let handler: GlobalErrorHandler;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let sentryServiceSpy: jasmine.SpyObj<SentryService>;
  let ngZone: NgZone;

  beforeEach(() => {
    toastServiceSpy = jasmine.createSpyObj<ToastService>('ToastService', ['add']);
    sentryServiceSpy = jasmine.createSpyObj<SentryService>('SentryService', ['captureException']);

    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: SentryService, useValue: sentryServiceSpy },
      ],
    });

    handler = TestBed.inject(GlobalErrorHandler);
    ngZone = TestBed.inject(NgZone);
  });

  it('powinien zostać utworzony', () => {
    expect(handler).toBeTruthy();
  });

  describe('handleError', () => {
    it('powinien zalogować błąd i wyświetlić toast', () => {
      spyOn(console, 'error');
      const error: Error = new Error('Test error');

      handler.handleError(error);

      expect(console.error).toHaveBeenCalledWith('[GlobalErrorHandler]', error);
      expect(sentryServiceSpy.captureException).toHaveBeenCalledWith(error);
      expect(toastServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          severity: 'error',
          summary: 'Wystąpił błąd',
          detail: 'Test error',
          life: 6000,
        })
      );
    });

    it('powinien zignorować błąd z wzorcem ResizeObserver loop', () => {
      spyOn(console, 'warn');
      spyOn(console, 'error');
      const error: Error = new Error('ResizeObserver loop completed with undelivered notifications.');

      handler.handleError(error);

      expect(console.warn).toHaveBeenCalledWith('[GlobalErrorHandler] Ignored:', jasmine.any(String));
      expect(console.error).not.toHaveBeenCalled();
      expect(sentryServiceSpy.captureException).not.toHaveBeenCalled();
      expect(toastServiceSpy.add).not.toHaveBeenCalled();
    });

    it('powinien zignorować błąd z wzorcem Loading chunk', () => {
      spyOn(console, 'warn');
      spyOn(console, 'error');
      const error: Error = new Error('Loading chunk 123 failed');

      handler.handleError(error);

      expect(console.warn).toHaveBeenCalled();
      expect(sentryServiceSpy.captureException).not.toHaveBeenCalled();
    });

    it('powinien zignorować błąd z wzorcem ChunkLoadError', () => {
      spyOn(console, 'warn');
      spyOn(console, 'error');
      const error: Error = new Error('ChunkLoadError: chunk xyz');

      handler.handleError(error);

      expect(sentryServiceSpy.captureException).not.toHaveBeenCalled();
    });

    it('powinien zignorować błąd z wzorcem Network Error', () => {
      spyOn(console, 'warn');
      spyOn(console, 'error');
      const error: Error = new Error('Network Error');

      handler.handleError(error);

      expect(sentryServiceSpy.captureException).not.toHaveBeenCalled();
    });

    it('powinien zignorować błąd z wzorcem AbortError', () => {
      spyOn(console, 'warn');
      spyOn(console, 'error');
      const error: Error = new Error('AbortError');

      handler.handleError(error);

      expect(sentryServiceSpy.captureException).not.toHaveBeenCalled();
    });

    it('powinien zignorować błąd z wzorcem cancelled', () => {
      spyOn(console, 'warn');
      spyOn(console, 'error');
      const error: Error = new Error('Request cancelled');

      handler.handleError(error);

      expect(sentryServiceSpy.captureException).not.toHaveBeenCalled();
    });

    it('powinien uruchomić toast wewnątrz NgZone', () => {
      spyOn(console, 'error');
      spyOn(ngZone, 'run').and.callThrough();
      const error: Error = new Error('Zone test error');

      handler.handleError(error);

      expect(ngZone.run).toHaveBeenCalled();
      expect(toastServiceSpy.add).toHaveBeenCalled();
    });
  });

  describe('extractMessage', () => {
    beforeEach(() => {
      spyOn(console, 'error');
    });

    it('powinien zwrócić wiadomość z obiektu Error', () => {
      const error: Error = new Error('Specific error message');

      handler.handleError(error);

      expect(toastServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ detail: 'Specific error message' })
      );
    });

    it('powinien zwrócić komunikat ogólny dla błędu Angular NG0', () => {
      const error: Error = new Error('NG0100: some Angular error');

      handler.handleError(error);

      expect(toastServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          detail: 'Wystąpił nieoczekiwany błąd aplikacji. Odśwież stronę.',
        })
      );
    });

    it('powinien zwrócić "Nieznany błąd" dla Error bez wiadomości', () => {
      const error: Error = new Error('');

      handler.handleError(error);

      expect(toastServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ detail: 'Nieznany błąd' })
      );
    });

    it('powinien zwrócić tekst błędu, gdy error jest stringiem', () => {
      const error: string = 'Prosty błąd tekstowy';

      handler.handleError(error);

      expect(toastServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ detail: 'Prosty błąd tekstowy' })
      );
    });

    it('powinien wyciągnąć message z obiektu z właściwością message', () => {
      const error: { message: string } = { message: 'Obiekt z wiadomością' };

      handler.handleError(error);

      expect(toastServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ detail: 'Obiekt z wiadomością' })
      );
    });

    it('powinien wyciągnąć message z obiektu rejection', () => {
      const error: { rejection: { message: string } } = {
        rejection: { message: 'Rejection error message' },
      };

      handler.handleError(error);

      expect(toastServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ detail: 'Rejection error message' })
      );
    });

    it('powinien zwrócić domyślny komunikat dla nieznanego typu błędu', () => {
      const error: number = 42;

      handler.handleError(error);

      expect(toastServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          detail: 'Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.',
        })
      );
    });

    it('powinien zwrócić domyślny komunikat dla null', () => {
      handler.handleError(null);

      expect(toastServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          detail: 'Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.',
        })
      );
    });

    it('powinien zwrócić domyślny komunikat dla obiektu bez message i rejection', () => {
      const error: { code: number } = { code: 500 };

      handler.handleError(error);

      expect(toastServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          detail: 'Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.',
        })
      );
    });

    it('powinien zwrócić domyślny komunikat dla obiektu z rejection bez message', () => {
      const error: { rejection: { code: number } } = { rejection: { code: 404 } };

      handler.handleError(error);

      expect(toastServiceSpy.add).toHaveBeenCalledWith(
        jasmine.objectContaining({
          detail: 'Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.',
        })
      );
    });
  });
});
