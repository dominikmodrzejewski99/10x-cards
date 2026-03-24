import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthStore } from '../store';
import { AuthRedirectService } from '../services/auth-redirect.service';
import { Observable } from 'rxjs';
import { signal, WritableSignal } from '@angular/core';

describe('authGuard', () => {
  let routerSpy: jasmine.SpyObj<Router>;
  let authRedirectSpy: jasmine.SpyObj<AuthRedirectService>;
  let mockAuthChecked: WritableSignal<boolean>;
  let mockIsAuthenticated: WritableSignal<boolean>;
  let mockCheckAuthState: jasmine.Spy;
  let loginUrlTree: UrlTree;

  beforeEach(() => {
    mockAuthChecked = signal<boolean>(true);
    mockIsAuthenticated = signal<boolean>(false);
    mockCheckAuthState = jasmine.createSpy('checkAuthState');

    routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    loginUrlTree = { toString: () => '/login' } as unknown as UrlTree;
    routerSpy.createUrlTree.and.returnValue(loginUrlTree);

    authRedirectSpy = jasmine.createSpyObj<AuthRedirectService>('AuthRedirectService', ['setRedirectUrl']);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AuthRedirectService, useValue: authRedirectSpy },
        {
          provide: AuthStore,
          useValue: {
            authChecked: mockAuthChecked,
            isAuthenticated: mockIsAuthenticated,
            checkAuthState: mockCheckAuthState,
          },
        },
      ],
    });
  });

  function runGuard(stateUrl: string = '/protected'): Observable<boolean | UrlTree> {
    const route: ActivatedRouteSnapshot = {} as ActivatedRouteSnapshot;
    const state: RouterStateSnapshot = { url: stateUrl } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => authGuard(route, state)) as Observable<boolean | UrlTree>;
  }

  it('should allow authenticated users through', fakeAsync(() => {
    mockIsAuthenticated.set(true);
    let result: boolean | UrlTree | undefined;

    runGuard().subscribe((val: boolean | UrlTree) => {
      result = val;
    });
    tick();

    expect(result).toBeTrue();
  }));

  it('should redirect unauthenticated users to /login', fakeAsync(() => {
    mockIsAuthenticated.set(false);
    let result: boolean | UrlTree | undefined;

    runGuard('/some-page').subscribe((val: boolean | UrlTree) => {
      result = val;
    });
    tick();

    expect(result).toBe(loginUrlTree);
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/login']);
  }));

  it('should save the attempted URL before redirecting', fakeAsync(() => {
    mockIsAuthenticated.set(false);

    runGuard('/protected-page').subscribe();
    tick();

    expect(authRedirectSpy.setRedirectUrl).toHaveBeenCalledWith('/protected-page');
  }));

  it('should call checkAuthState on invocation', fakeAsync(() => {
    mockIsAuthenticated.set(true);

    runGuard().subscribe();
    tick();

    expect(mockCheckAuthState).toHaveBeenCalled();
  }));
});
