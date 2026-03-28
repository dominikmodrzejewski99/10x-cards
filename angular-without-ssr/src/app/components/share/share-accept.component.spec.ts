import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ShareAcceptComponent } from './share-accept.component';
import { ShareService } from '../../services/share.service';

describe('ShareAcceptComponent', () => {
  let component: ShareAcceptComponent;
  let fixture: ComponentFixture<ShareAcceptComponent>;

  let shareServiceMock: jasmine.SpyObj<ShareService>;
  let routerMock: jasmine.SpyObj<Router>;
  let paramMapGetSpy: jasmine.Spy;

  const MOCK_TOKEN = 'test-token-uuid';
  const MOCK_NEW_SET_ID = 77;

  function configureTestBed(token: string | null = MOCK_TOKEN): void {
    paramMapGetSpy = jasmine.createSpy('get').and.returnValue(token);

    shareServiceMock = jasmine.createSpyObj<ShareService>('ShareService', ['acceptShareLink']);
    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [ShareAcceptComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: paramMapGetSpy } } } },
        { provide: Router, useValue: routerMock },
        { provide: ShareService, useValue: shareServiceMock }
      ]
    });
  }

  describe('missing token', () => {
    beforeEach(async () => {
      configureTestBed(null);
      await TestBed.compileComponents();
      fixture = TestBed.createComponent(ShareAcceptComponent);
      component = fixture.componentInstance;
    });

    it('should show error for missing token', () => {
      fixture.detectChanges();

      expect(component.error()).toBe('Nieprawidłowy link');
      expect(component.loading()).toBeFalse();
      expect(shareServiceMock.acceptShareLink).not.toHaveBeenCalled();
    });
  });

  describe('with valid token', () => {
    beforeEach(async () => {
      configureTestBed(MOCK_TOKEN);
      await TestBed.compileComponents();
      fixture = TestBed.createComponent(ShareAcceptComponent);
      component = fixture.componentInstance;
    });

    it('should call acceptShareLink and navigate to new set on success', async () => {
      shareServiceMock.acceptShareLink.and.returnValue(Promise.resolve(MOCK_NEW_SET_ID));

      fixture.detectChanges();
      await fixture.whenStable();

      expect(shareServiceMock.acceptShareLink).toHaveBeenCalledWith(MOCK_TOKEN);
      expect(routerMock.navigate).toHaveBeenCalledWith(
        ['/sets', MOCK_NEW_SET_ID],
        { queryParams: { shared: 'true' } }
      );
    });

    it('should show expired error message when error includes "expired"', async () => {
      shareServiceMock.acceptShareLink.and.returnValue(Promise.reject(new Error('Link expired')));

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.error()).toBe('Link wygasł. Poproś właściciela o nowy link.');
      expect(component.loading()).toBeFalse();
    });

    it('should show not found error message when error includes "not found"', async () => {
      shareServiceMock.acceptShareLink.and.returnValue(Promise.reject(new Error('Link not found')));

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.error()).toBe('Link jest nieprawidłowy lub został usunięty.');
      expect(component.loading()).toBeFalse();
    });

    it('should show generic error for unknown errors', async () => {
      shareServiceMock.acceptShareLink.and.returnValue(Promise.reject(new Error('Something went wrong')));

      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.error()).toBe('Wystąpił błąd. Spróbuj ponownie później.');
      expect(component.loading()).toBeFalse();
    });

    it('should navigate to dashboard when goToDashboard is called', () => {
      shareServiceMock.acceptShareLink.and.returnValue(Promise.resolve(MOCK_NEW_SET_ID));

      fixture.detectChanges();
      component.goToDashboard();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });
});
