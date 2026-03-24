import { TestBed } from '@angular/core/testing';
import { LoggerService, LogEntry } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LoggerService],
    });
    service = TestBed.inject(LoggerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('error', () => {
    it('should add an error entry to the buffer', () => {
      const testError: Error = new Error('test failure');

      service.error('TestClass.method', testError);

      const logs: ReadonlyArray<LogEntry> = service.getRecentLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe('error');
      expect(logs[0].context).toBe('TestClass.method');
      expect(logs[0].message).toBe('test failure');
      expect(logs[0].error).toBe(testError);
    });

    it('should extract message from a string error', () => {
      service.error('TestClass.method', 'string error message');

      const logs: ReadonlyArray<LogEntry> = service.getRecentLogs();
      expect(logs[0].message).toBe('string error message');
    });

    it('should extract message from an object with message property', () => {
      const errorObj: { message: string; code: number } = { message: 'object error', code: 500 };

      service.error('TestClass.method', errorObj);

      const logs: ReadonlyArray<LogEntry> = service.getRecentLogs();
      expect(logs[0].message).toBe('object error');
    });

    it('should handle unknown error types', () => {
      service.error('TestClass.method', 42);

      const logs: ReadonlyArray<LogEntry> = service.getRecentLogs();
      expect(logs[0].message).toBe('Unknown error');
    });

    it('should set timestamp on error entry', () => {
      const before: Date = new Date();
      service.error('TestClass.method', new Error('test'));
      const after: Date = new Date();

      const logs: ReadonlyArray<LogEntry> = service.getRecentLogs();
      expect(logs[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(logs[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('warn', () => {
    it('should add a warn entry to the buffer', () => {
      service.warn('TestClass.init', 'something is off');

      const logs: ReadonlyArray<LogEntry> = service.getRecentLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe('warn');
      expect(logs[0].context).toBe('TestClass.init');
      expect(logs[0].message).toBe('something is off');
      expect(logs[0].error).toBeUndefined();
    });
  });

  describe('buffer management', () => {
    it('should keep only the last 50 entries', () => {
      for (let i: number = 0; i < 60; i++) {
        service.error('Test.loop', new Error(`error ${i}`));
      }

      const logs: ReadonlyArray<LogEntry> = service.getRecentLogs();
      expect(logs.length).toBe(50);
      expect(logs[0].message).toBe('error 10');
      expect(logs[49].message).toBe('error 59');
    });

    it('should return a copy of the buffer from getRecentLogs', () => {
      service.error('Test.method', new Error('test'));

      const logs1: ReadonlyArray<LogEntry> = service.getRecentLogs();
      const logs2: ReadonlyArray<LogEntry> = service.getRecentLogs();

      expect(logs1).not.toBe(logs2);
      expect(logs1).toEqual(logs2);
    });
  });

  describe('clearLogs', () => {
    it('should empty the buffer', () => {
      service.error('Test.method', new Error('test'));
      service.warn('Test.method', 'warning');
      expect(service.getRecentLogs().length).toBe(2);

      service.clearLogs();

      expect(service.getRecentLogs().length).toBe(0);
    });
  });

  describe('console output in dev mode', () => {
    it('should call console.error in dev mode', () => {
      spyOn(console, 'error');
      const testError: Error = new Error('dev error');

      service.error('DevTest.method', testError);

      // In test environment, isDevMode() returns true
      expect(console.error).toHaveBeenCalledWith('[DevTest.method]', testError);
    });

    it('should call console.warn in dev mode', () => {
      spyOn(console, 'warn');

      service.warn('DevTest.method', 'dev warning');

      expect(console.warn).toHaveBeenCalledWith('[DevTest.method]', 'dev warning');
    });
  });
});
