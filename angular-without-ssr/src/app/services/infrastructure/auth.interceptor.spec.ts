import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { SupabaseClientFactory } from './supabase-client.factory';
import { SupabaseClient } from '@supabase/supabase-js';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockToken = 'mock-access-token-123';

  function setupTestBed(sessionPromise: Promise<{ data: { session: { access_token: string } | null } }>): void {
    const mockSupabase: {
      auth: { getSession: jasmine.Spy; signOut: jasmine.Spy };
    } = {
      auth: {
        getSession: jasmine.createSpy('getSession').and.returnValue(sessionPromise),
        signOut: jasmine.createSpy('signOut').and.returnValue(Promise.resolve()),
      },
    };

    const factorySpy: jasmine.SpyObj<SupabaseClientFactory> = jasmine.createSpyObj<SupabaseClientFactory>(
      'SupabaseClientFactory',
      ['getClient']
    );
    factorySpy.getClient.and.returnValue(mockSupabase as unknown as SupabaseClient);

    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: SupabaseClientFactory, useValue: factorySpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('should add Bearer token when session exists', (done: DoneFn) => {
    setupTestBed(Promise.resolve({ data: { session: { access_token: mockToken } } }));

    httpClient.get('/api/test').subscribe({
      next: () => done(),
      error: done.fail,
    });

    // Wait for the async getSession promise to resolve
    setTimeout(() => {
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush({});
    });
  });

  it('should not add Authorization header when no session', (done: DoneFn) => {
    setupTestBed(Promise.resolve({ data: { session: null } }));

    httpClient.get('/api/test').subscribe({
      next: () => done(),
      error: done.fail,
    });

    setTimeout(() => {
      const req = httpMock.expectOne('/api/test');
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({});
    });
  });

  it('should redirect to /login on 401 response', (done: DoneFn) => {
    setupTestBed(Promise.resolve({ data: { session: { access_token: mockToken } } }));

    httpClient.get('/api/protected').subscribe({
      next: () => done.fail('Expected error'),
      error: () => {
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
        done();
      },
    });

    setTimeout(() => {
      const req = httpMock.expectOne('/api/protected');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });
});
