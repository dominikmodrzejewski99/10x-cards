import { TestBed } from '@angular/core/testing';
import * as Sentry from '@sentry/angular';
import { SentryService } from './sentry.service';
import { environment } from '../../environments/environments.default';

describe('SentryService', () => {
  let service: SentryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SentryService],
    });
    service = TestBed.inject(SentryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('init', () => {
    it('should not call Sentry.init when DSN is empty', () => {
      spyOn(Sentry, 'init');
      spyOnProperty(environment, 'sentryDsn', 'get').and.returnValue('');

      SentryService.init();

      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it('should call Sentry.init when DSN is provided', () => {
      spyOn(Sentry, 'init');
      spyOnProperty(environment, 'sentryDsn', 'get').and.returnValue('https://test@sentry.io/123');

      SentryService.init();

      expect(Sentry.init).toHaveBeenCalledWith(
        jasmine.objectContaining({
          dsn: 'https://test@sentry.io/123',
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0,
        })
      );
    });
  });

  describe('captureException', () => {
    it('should not call Sentry.captureException when not initialized', () => {
      spyOn(Sentry, 'isInitialized').and.returnValue(false);
      spyOn(Sentry, 'captureException');

      const error: Error = new Error('test error');
      service.captureException(error);

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should call Sentry.captureException when initialized', () => {
      spyOn(Sentry, 'isInitialized').and.returnValue(true);
      spyOn(Sentry, 'captureException');

      const error: Error = new Error('test error');
      service.captureException(error);

      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
  });

  describe('addBreadcrumb', () => {
    it('should not call Sentry.addBreadcrumb when not initialized', () => {
      spyOn(Sentry, 'isInitialized').and.returnValue(false);
      spyOn(Sentry, 'addBreadcrumb');

      service.addBreadcrumb('test-category', 'test message', 'error');

      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
    });

    it('should call Sentry.addBreadcrumb when initialized', () => {
      spyOn(Sentry, 'isInitialized').and.returnValue(true);
      spyOn(Sentry, 'addBreadcrumb');

      service.addBreadcrumb('test-category', 'test message', 'error');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'test-category',
        message: 'test message',
        level: 'error',
      });
    });

    it('should pass warning level correctly', () => {
      spyOn(Sentry, 'isInitialized').and.returnValue(true);
      spyOn(Sentry, 'addBreadcrumb');

      service.addBreadcrumb('warn-category', 'warning message', 'warning');

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'warn-category',
        message: 'warning message',
        level: 'warning',
      });
    });
  });
});
