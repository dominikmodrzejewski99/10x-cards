import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { NotificationBellComponent } from './notification-bell.component';
import { NotificationService } from '../../../services/notification.service';
import { FriendshipService } from '../../../services/friendship.service';
import { ToastService } from '../../services/toast.service';
import { NotificationDTO } from '../../../../types';

describe('NotificationBellComponent', () => {
  let component: NotificationBellComponent;
  let fixture: ComponentFixture<NotificationBellComponent>;
  let notificationServiceMock: jasmine.SpyObj<NotificationService>;
  let friendshipServiceMock: jasmine.SpyObj<FriendshipService>;
  let toastServiceMock: jasmine.SpyObj<ToastService>;
  let routerMock: jasmine.SpyObj<Router>;

  const mockNotification: NotificationDTO = {
    id: 'n1',
    user_id: 'user-1',
    type: 'friend_request',
    from_user_id: 'user-2',
    data: { from_email: 'te...@test.com' },
    read: false,
    created_at: '2026-04-01T00:00:00Z'
  };

  beforeEach(async () => {
    notificationServiceMock = jasmine.createSpyObj('NotificationService', [
      'getUnreadCount', 'getNotifications', 'markAsRead', 'markAllAsRead'
    ]);
    friendshipServiceMock = jasmine.createSpyObj('FriendshipService', ['acceptDeckShare']);
    toastServiceMock = jasmine.createSpyObj('ToastService', ['add']);
    routerMock = jasmine.createSpyObj('Router', ['navigate']);

    notificationServiceMock.getUnreadCount.and.returnValue(Promise.resolve(3));
    notificationServiceMock.getNotifications.and.returnValue(Promise.resolve([mockNotification]));

    await TestBed.configureTestingModule({
      imports: [
        NotificationBellComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' }
        })
      ],
      providers: [
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: FriendshipService, useValue: friendshipServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBellComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('powinien utworzyc komponent', () => {
    expect(component).toBeTruthy();
  });

  it('powinien zaladowac liczbe nieprzeczytanych przy init', async () => {
    await component.ngOnInit();

    expect(notificationServiceMock.getUnreadCount).toHaveBeenCalled();
    expect(component.unreadCount()).toBe(3);
  });

  it('powinien otworzyc panel i zaladowac notyfikacje', async () => {
    expect(component.panelOpen()).toBeFalse();

    await component.togglePanel();

    expect(component.panelOpen()).toBeTrue();
    expect(notificationServiceMock.getNotifications).toHaveBeenCalledWith(10);
    expect(component.notifications().length).toBe(1);
  });

  it('powinien zamknac panel po ponownym kliknieciu', async () => {
    await component.togglePanel();
    expect(component.panelOpen()).toBeTrue();

    await component.togglePanel();
    expect(component.panelOpen()).toBeFalse();
  });

  it('powinien oznaczyc wszystkie jako przeczytane', async () => {
    notificationServiceMock.markAllAsRead.and.returnValue(Promise.resolve());
    component.unreadCount.set(3);
    component.notifications.set([mockNotification]);

    await component.markAllAsRead();

    expect(notificationServiceMock.markAllAsRead).toHaveBeenCalled();
    expect(component.unreadCount()).toBe(0);
    expect(component.notifications()[0].read).toBeTrue();
  });

  it('powinien nawigowac do /friends po kliknieciu notyfikacji friend_request', async () => {
    notificationServiceMock.markAsRead.and.returnValue(Promise.resolve());

    await component.onNotificationClick(mockNotification);

    expect(notificationServiceMock.markAsRead).toHaveBeenCalledWith('n1');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/friends']);
    expect(component.panelOpen()).toBeFalse();
  });

  it('powinien zwrocic poprawna ikone dla typu notyfikacji', () => {
    expect(component.getNotificationIcon('friend_request')).toBe('pi-user-plus');
    expect(component.getNotificationIcon('friend_accepted')).toBe('pi-check-circle');
    expect(component.getNotificationIcon('nudge')).toBe('pi-bell');
    expect(component.getNotificationIcon('deck_shared')).toBe('pi-share-alt');
    expect(component.getNotificationIcon('unknown')).toBe('pi-info-circle');
  });

  describe('acceptDeckShare', () => {
    const deckSharedNotif: NotificationDTO = {
      id: 'n2',
      user_id: 'user-1',
      type: 'deck_shared',
      from_user_id: 'user-2',
      data: { from_email: 'te...@test.com', set_name: 'Angular Signals', deck_share_id: 'share-123' },
      read: false,
      created_at: '2026-04-07T00:00:00Z'
    };

    it('powinien zaakceptowac udostepniony zestaw i nawigowac', async () => {
      friendshipServiceMock.acceptDeckShare.and.returnValue(Promise.resolve(99));
      notificationServiceMock.markAsRead.and.returnValue(Promise.resolve());
      component.notifications.set([deckSharedNotif]);
      component.unreadCount.set(1);

      const event = new Event('click');
      await component.acceptDeckShare(deckSharedNotif, event);

      expect(friendshipServiceMock.acceptDeckShare).toHaveBeenCalledWith('share-123');
      expect(notificationServiceMock.markAsRead).toHaveBeenCalledWith('n2');
      expect(routerMock.navigate).toHaveBeenCalledWith(['/sets', 99], { queryParams: { shared: 'true' } });
      expect(component.panelOpen()).toBeFalse();
    });

    it('powinien pokazac toast bledu przy niepowodzeniu', async () => {
      friendshipServiceMock.acceptDeckShare.and.returnValue(Promise.reject(new Error('fail')));
      component.notifications.set([deckSharedNotif]);

      const event = new Event('click');
      await component.acceptDeckShare(deckSharedNotif, event);

      expect(toastServiceMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
    });
  });
});
