import { TestBed } from '@angular/core/testing';
import { SentryService } from './sentry.service';

/**
 * SentryService wraps @sentry/angular whose exports are frozen ESM bindings
 * and cannot be spied on directly. Instead, we verify:
 *  - The service is injectable
 *  - Instance methods do not throw when called (guarded by isInitialized)
 */
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

  describe('captureException', () => {
    it('should not throw when Sentry is not initialized', () => {
      expect(() => service.captureException(new Error('test'))).not.toThrow();
    });

    it('should not throw with string error', () => {
      expect(() => service.captureException('test error')).not.toThrow();
    });
  });

  describe('addBreadcrumb', () => {
    it('should not throw when Sentry is not initialized', () => {
      expect(() => service.addBreadcrumb('test', 'message', 'error')).not.toThrow();
    });

    it('should not throw with different severity levels', () => {
      expect(() => service.addBreadcrumb('test', 'message', 'warning')).not.toThrow();
      expect(() => service.addBreadcrumb('test', 'message', 'info')).not.toThrow();
    });
  });
});
