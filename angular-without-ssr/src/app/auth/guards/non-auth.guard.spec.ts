import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { nonAuthGuard } from './non-auth.guard';
import { AuthStore } from '../store';
import { Observable } from 'rxjs';
import { signal, WritableSignal } from '@angular/core';

describe('nonAuthGuard', () => {
  let routerSpy: jasmine.SpyObj<Router>;
  let mockAuthChecked: WritableSignal<boolean>;
  let mockIsAuthenticated: WritableSignal<boolean>;
  let mockIsAnonymous: WritableSignal<boolean>;
  let mockCheckAuthState: jasmine.Spy;
  let dashboardUrlTree: UrlTree;

  beforeEach(() => {
    mockAuthChecked = signal<boolean>(true);
    mockIsAuthenticated = signal<boolean>(false);
    mockIsAnonymous = signal<boolean>(false);
    mockCheckAuthState = jasmine.createSpy('checkAuthState');

    routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    dashboardUrlTree = { toString: () => '/dashboard' } as unknown as UrlTree;
    routerSpy.createUrlTree.and.returnValue(dashboardUrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy },
        {
          provide: AuthStore,
          useValue: {
            authChecked: mockAuthChecked,
            isAuthenticated: mockIsAuthenticated,
            isAnonymous: mockIsAnonymous,
            checkAuthState: mockCheckAuthState,
          },
        },
      ],
    });
  });

  function runGuard(): Observable<boolean | UrlTree> {
    const route: ActivatedRouteSnapshot = {} as ActivatedRouteSnapshot;
    const state: RouterStateSnapshot = { url: '/login' } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => nonAuthGuard(route, state)) as Observable<boolean | UrlTree>;
  }

  it('should allow unauthenticated users through', fakeAsync(() => {
    mockIsAuthenticated.set(false);
    mockIsAnonymous.set(false);
    let result: boolean | UrlTree | undefined;

    runGuard().subscribe((val: boolean | UrlTree) => {
      result = val;
    });
    tick();

    expect(result).toBeTrue();
  }));

  it('should allow anonymous users through', fakeAsync(() => {
    mockIsAuthenticated.set(true);
    mockIsAnonymous.set(true);
    let result: boolean | UrlTree | undefined;

    runGuard().subscribe((val: boolean | UrlTree) => {
      result = val;
    });
    tick();

    expect(result).toBeTrue();
  }));

  it('should redirect authenticated non-anonymous users to /dashboard', fakeAsync(() => {
    mockIsAuthenticated.set(true);
    mockIsAnonymous.set(false);
    let result: boolean | UrlTree | undefined;

    runGuard().subscribe((val: boolean | UrlTree) => {
      result = val;
    });
    tick();

    expect(result).toBe(dashboardUrlTree);
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  }));

  it('should call checkAuthState on invocation', fakeAsync(() => {
    mockIsAuthenticated.set(false);

    runGuard().subscribe();
    tick();

    expect(mockCheckAuthState).toHaveBeenCalled();
  }));
});
