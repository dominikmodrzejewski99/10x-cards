import { TestBed } from '@angular/core/testing';
import { SentryService } from './sentry.service';
import { environment } from '../../environments/environments.default';

/**
 * SentryService wraps @sentry/angular whose exports are frozen ESM bindings
 * and cannot be spied on directly. Instead, we verify:
 *  - The service is injectable
 *  - Static init() reads environment.sentryDsn and returns early when empty
 *  - Instance methods do not throw when called (guarded by isInitialized)
 */
describe('SentryService', () => {
  let service: SentryService;
  let sentryDsnDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    sentryDsnDescriptor = Object.getOwnPropertyDescriptor(environment, 'sentryDsn');

    TestBed.configureTestingModule({
      providers: [SentryService],
    });
    service = TestBed.inject(SentryService);
  });

  afterEach(() => {
    if (sentryDsnDescriptor) {
      Object.defineProperty(environment, 'sentryDsn', sentryDsnDescriptor);
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('init', () => {
    it('should not throw when DSN is empty', () => {
      Object.defineProperty(environment, 'sentryDsn', { get: () => '', configurable: true });
      expect(() => SentryService.init()).not.toThrow();
    });

    it('should not throw when DSN is provided', () => {
      // Note: calling Sentry.init with a real DSN in test env is harmless
      // as it just configures the SDK without sending data
      Object.defineProperty(environment, 'sentryDsn', { get: () => 'https://examplePublicKey@o0.ingest.sentry.io/0', configurable: true });
      expect(() => SentryService.init()).not.toThrow();
    });
  });

  describe('captureException', () => {
    it('should not throw when Sentry is not initialized', () => {
      // Sentry is not initialized in test env, so isInitialized() returns false
      const error: Error = new Error('test error');
      expect(() => service.captureException(error)).not.toThrow();
    });

    it('should accept any error type', () => {
      expect(() => service.captureException('string error')).not.toThrow();
      expect(() => service.captureException(42)).not.toThrow();
      expect(() => service.captureException(null)).not.toThrow();
    });
  });

  describe('addBreadcrumb', () => {
    it('should not throw when Sentry is not initialized', () => {
      expect(() => service.addBreadcrumb('test-category', 'test message', 'error')).not.toThrow();
    });

    it('should accept different severity levels', () => {
      expect(() => service.addBreadcrumb('cat', 'msg', 'warning')).not.toThrow();
      expect(() => service.addBreadcrumb('cat', 'msg', 'info')).not.toThrow();
      expect(() => service.addBreadcrumb('cat', 'msg', 'error')).not.toThrow();
    });
  });
});
