import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthRedirectService } from './auth-redirect.service';

describe('AuthRedirectService', () => {
  let service: AuthRedirectService;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    routerSpy.navigateByUrl.and.returnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      providers: [
        AuthRedirectService,
        { provide: Router, useValue: routerSpy }
      ]
    });
    service = TestBed.inject(AuthRedirectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setRedirectUrl', () => {
    it('should store a valid URL', () => {
      service.setRedirectUrl('/dashboard');
      const url: string | null = service.getRedirectUrl();

      expect(url).toBe('/dashboard');
    });

    it('should not store URL containing /login', () => {
      service.setRedirectUrl('/login');
      const url: string | null = service.getRedirectUrl();

      expect(url).toBeNull();
    });

    it('should not store URL containing /register', () => {
      service.setRedirectUrl('/register');
      const url: string | null = service.getRedirectUrl();

      expect(url).toBeNull();
    });

    it('should not store URL containing /login as part of path', () => {
      service.setRedirectUrl('/auth/login?redirect=home');
      const url: string | null = service.getRedirectUrl();

      expect(url).toBeNull();
    });

    it('should overwrite previously stored URL', () => {
      service.setRedirectUrl('/first');
      service.setRedirectUrl('/second');
      const url: string | null = service.getRedirectUrl();

      expect(url).toBe('/second');
    });
  });

  describe('getRedirectUrl', () => {
    it('should return null when no URL is stored', () => {
      const url: string | null = service.getRedirectUrl();

      expect(url).toBeNull();
    });

    it('should clear the stored URL after retrieval', () => {
      service.setRedirectUrl('/dashboard');
      service.getRedirectUrl(); // first call clears it
      const url: string | null = service.getRedirectUrl();

      expect(url).toBeNull();
    });
  });

  describe('redirectToSavedUrlOrDefault', () => {
    it('should navigate to saved URL when available', () => {
      service.setRedirectUrl('/my-sets');
      service.redirectToSavedUrlOrDefault();

      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/my-sets');
    });

    it('should navigate to default /sets when no saved URL', () => {
      service.redirectToSavedUrlOrDefault();

      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/sets');
    });

    it('should navigate to custom default URL when provided and no saved URL', () => {
      service.redirectToSavedUrlOrDefault('/home');

      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/home');
    });

    it('should clear the saved URL after redirecting', () => {
      service.setRedirectUrl('/dashboard');
      service.redirectToSavedUrlOrDefault();

      // URL should be cleared now
      const url: string | null = service.getRedirectUrl();
      expect(url).toBeNull();
    });
  });
});
