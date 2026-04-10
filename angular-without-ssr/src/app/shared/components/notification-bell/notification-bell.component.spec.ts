import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { NotificationBellComponent } from './notification-bell.component';
import { NotificationFacadeService } from '../../../services/notification-facade.service';

describe('NotificationBellComponent', () => {
  let component: NotificationBellComponent;
  let fixture: ComponentFixture<NotificationBellComponent>;

  const facadeMock: Record<string, jasmine.Spy> = {
    unreadCountSignal: jasmine.createSpy('unreadCountSignal').and.returnValue(0),
    notificationsSignal: jasmine.createSpy('notificationsSignal').and.returnValue([]),
    panelOpenSignal: jasmine.createSpy('panelOpenSignal').and.returnValue(false),
    loadingSignal: jasmine.createSpy('loadingSignal').and.returnValue(false),
    navigationTargetSignal: jasmine.createSpy('navigationTargetSignal').and.returnValue(null),

    init: jasmine.createSpy('init'),
    destroy: jasmine.createSpy('destroy'),
    togglePanel: jasmine.createSpy('togglePanel').and.returnValue(Promise.resolve()),
    markAllAsRead: jasmine.createSpy('markAllAsRead').and.returnValue(Promise.resolve()),
    onNotificationClick: jasmine.createSpy('onNotificationClick').and.returnValue(Promise.resolve()),
    acceptDeckShare: jasmine.createSpy('acceptDeckShare').and.returnValue(Promise.resolve()),
    closePanel: jasmine.createSpy('closePanel'),
    clearNavigationTarget: jasmine.createSpy('clearNavigationTarget'),
    getNotificationIcon: jasmine.createSpy('getNotificationIcon').and.returnValue('pi-info-circle'),
  };

  beforeEach(async () => {
    Object.values(facadeMock).forEach((spy: jasmine.Spy) => spy.calls.reset());

    await TestBed.configureTestingModule({
      imports: [
        NotificationBellComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: NotificationFacadeService, useValue: facadeMock },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBellComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call facade.init()', () => {
      fixture.detectChanges();

      expect(facadeMock['init']).toHaveBeenCalledTimes(1);
    });
  });

  describe('ngOnDestroy', () => {
    it('should call facade.destroy()', () => {
      component.ngOnDestroy();

      expect(facadeMock['destroy']).toHaveBeenCalledTimes(1);
    });
  });

  describe('onDocumentClick', () => {
    it('should call facade.closePanel when clicking outside', () => {
      const outsideEvent = new Event('click');
      Object.defineProperty(outsideEvent, 'target', { value: document.createElement('div') });

      component.onDocumentClick(outsideEvent);

      expect(facadeMock['closePanel']).toHaveBeenCalled();
    });
  });
});
