import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { LanguageTestBankService } from './language-test-bank.service';
import { TestDefinition, TestLevel } from '../../types';

function createMockTestDefinition(level: TestLevel): TestDefinition {
  return {
    level,
    title: `Test ${level}`,
    description: `Description for ${level}`,
    passingScore: 60,
    questions: [
      {
        type: 'multiple-choice-cloze',
        id: 'q1',
        text: 'Sample question',
        options: ['a', 'b', 'c', 'd'],
        correctIndex: 0,
        category: 'grammar',
        subcategory: 'tenses',
        explanation: 'Explanation'
      }
    ]
  };
}

describe('LanguageTestBankService', () => {
  let service: LanguageTestBankService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        LanguageTestBankService
      ]
    });
    service = TestBed.inject(LanguageTestBankService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getTest', () => {
    it('should fetch test definition for b1 level', (done: DoneFn) => {
      const mockTest: TestDefinition = createMockTestDefinition('b1');

      service.getTest('b1').subscribe({
        next: (test: TestDefinition) => {
          expect(test).toEqual(mockTest);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne('assets/test-banks/b1.json');
      expect(req.request.method).toBe('GET');
      req.flush(mockTest);
    });

    it('should fetch test definition for b2-fce level', (done: DoneFn) => {
      const mockTest: TestDefinition = createMockTestDefinition('b2-fce');

      service.getTest('b2-fce').subscribe({
        next: (test: TestDefinition) => {
          expect(test).toEqual(mockTest);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne('assets/test-banks/b2-fce.json');
      req.flush(mockTest);
    });

    it('should fetch test definition for c1-cae level', (done: DoneFn) => {
      const mockTest: TestDefinition = createMockTestDefinition('c1-cae');

      service.getTest('c1-cae').subscribe({
        next: (test: TestDefinition) => {
          expect(test).toEqual(mockTest);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne('assets/test-banks/c1-cae.json');
      req.flush(mockTest);
    });

    it('should cache the observable and not make duplicate HTTP requests', (done: DoneFn) => {
      const mockTest: TestDefinition = createMockTestDefinition('b1');

      // First call
      service.getTest('b1').subscribe();
      // Second call should use cache
      service.getTest('b1').subscribe({
        next: (test: TestDefinition) => {
          expect(test).toEqual(mockTest);
          done();
        },
        error: done.fail
      });

      // Only one request should be made
      const req = httpMock.expectOne('assets/test-banks/b1.json');
      req.flush(mockTest);
    });

    it('should cache different levels independently', (done: DoneFn) => {
      const mockB1: TestDefinition = createMockTestDefinition('b1');
      const mockB2: TestDefinition = createMockTestDefinition('b2-fce');

      service.getTest('b1').subscribe();
      service.getTest('b2-fce').subscribe({
        next: (test: TestDefinition) => {
          expect(test).toEqual(mockB2);
          done();
        },
        error: done.fail
      });

      const reqB1 = httpMock.expectOne('assets/test-banks/b1.json');
      const reqB2 = httpMock.expectOne('assets/test-banks/b2-fce.json');
      reqB1.flush(mockB1);
      reqB2.flush(mockB2);
    });
  });

  describe('getAvailableLevels', () => {
    it('should return all three levels', () => {
      const levels = service.getAvailableLevels();

      expect(levels.length).toBe(3);
    });

    it('should include b1, b2-fce, and c1-cae levels', () => {
      const levels = service.getAvailableLevels();
      const levelIds: TestLevel[] = levels.map(l => l.level);

      expect(levelIds).toContain('b1');
      expect(levelIds).toContain('b2-fce');
      expect(levelIds).toContain('c1-cae');
    });

    it('should have required properties on each level', () => {
      const levels = service.getAvailableLevels();

      for (const level of levels) {
        expect(level.title).toBeTruthy();
        expect(level.description).toBeTruthy();
        expect(level.questionCount).toBeGreaterThan(0);
        expect(level.estimatedMinutes).toBeGreaterThan(0);
      }
    });
  });
});
