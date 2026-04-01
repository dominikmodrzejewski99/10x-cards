import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { FriendsListComponent } from './friends-list.component';
import { FriendshipService } from '../../services/friendship.service';
import { NotificationService } from '../../services/notification.service';
import { FriendDTO, FriendRequestDTO } from '../../../types';

describe('FriendsListComponent', () => {
  let component: FriendsListComponent;
  let fixture: ComponentFixture<FriendsListComponent>;
  let friendshipServiceMock: jasmine.SpyObj<FriendshipService>;
  let messageServiceMock: jasmine.SpyObj<MessageService>;

  const mockFriend: FriendDTO = {
    friendship_id: 'f1',
    user_id: 'u1',
    email_masked: 'te...@test.com',
    current_streak: 5,
    last_study_date: '2026-03-30',
    total_cards_reviewed: 100
  };

  const mockRequest: FriendRequestDTO = {
    friendship_id: 'r1',
    user_id: 'u2',
    email_masked: 'jo...@test.com',
    created_at: '2026-04-01T00:00:00Z'
  };

  beforeEach(async () => {
    friendshipServiceMock = jasmine.createSpyObj('FriendshipService', [
      'getFriends', 'getPendingRequests', 'sendRequest', 'respondToRequest', 'removeFriend', 'sendNudge'
    ]);
    messageServiceMock = jasmine.createSpyObj('MessageService', ['add']);

    friendshipServiceMock.getFriends.and.returnValue(Promise.resolve([mockFriend]));
    friendshipServiceMock.getPendingRequests.and.returnValue(Promise.resolve([mockRequest]));

    await TestBed.configureTestingModule({
      imports: [
        FriendsListComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' }
        })
      ],
      providers: [
        { provide: FriendshipService, useValue: friendshipServiceMock },
        { provide: NotificationService, useValue: {} }
      ]
    })
    .overrideComponent(FriendsListComponent, {
      set: { providers: [{ provide: MessageService, useValue: messageServiceMock }] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(FriendsListComponent);
    component = fixture.componentInstance;
  });

  it('powinien utworzyc komponent', () => {
    expect(component).toBeTruthy();
  });

  it('powinien zaladowac znajomych i zaproszenia przy init', async () => {
    await component.loadData();

    expect(friendshipServiceMock.getFriends).toHaveBeenCalled();
    expect(friendshipServiceMock.getPendingRequests).toHaveBeenCalled();
    expect(component.friends().length).toBe(1);
    expect(component.pendingRequests().length).toBe(1);
    expect(component.loading()).toBeFalse();
  });

  it('powinien wyslac zaproszenie po podaniu emaila', async () => {
    friendshipServiceMock.sendRequest.and.returnValue(Promise.resolve({ friendship_id: 'new', status: 'pending' }));
    component.emailInput.set('new@test.com');

    await component.sendRequest();

    expect(friendshipServiceMock.sendRequest).toHaveBeenCalledWith('new@test.com');
    expect(component.emailInput()).toBe('');
    expect(messageServiceMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
  });

  it('nie powinien wyslac zaproszenia gdy email pusty', async () => {
    component.emailInput.set('  ');

    await component.sendRequest();

    expect(friendshipServiceMock.sendRequest).not.toHaveBeenCalled();
  });

  it('powinien zaakceptowac zaproszenie', async () => {
    friendshipServiceMock.respondToRequest.and.returnValue(Promise.resolve());
    friendshipServiceMock.getFriends.and.returnValue(Promise.resolve([mockFriend]));
    friendshipServiceMock.getPendingRequests.and.returnValue(Promise.resolve([]));

    await component.acceptRequest('r1');

    expect(friendshipServiceMock.respondToRequest).toHaveBeenCalledWith('r1', true);
    expect(messageServiceMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
  });

  it('powinien odrzucic zaproszenie', async () => {
    component.pendingRequests.set([mockRequest]);
    friendshipServiceMock.respondToRequest.and.returnValue(Promise.resolve());

    await component.rejectRequest('r1');

    expect(friendshipServiceMock.respondToRequest).toHaveBeenCalledWith('r1', false);
    expect(component.pendingRequests().length).toBe(0);
  });

  it('powinien usunac znajomego', async () => {
    component.friends.set([mockFriend]);
    friendshipServiceMock.removeFriend.and.returnValue(Promise.resolve());

    await component.removeFriend('f1');

    expect(friendshipServiceMock.removeFriend).toHaveBeenCalledWith('f1');
    expect(component.friends().length).toBe(0);
  });

  it('powinien wyslac nudge', async () => {
    friendshipServiceMock.sendNudge.and.returnValue(Promise.resolve());

    await component.sendNudge('u1');

    expect(friendshipServiceMock.sendNudge).toHaveBeenCalledWith('u1');
    expect(messageServiceMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
  });

  describe('getDaysInactive', () => {
    it('powinien zwrocic null gdy brak daty', () => {
      expect(component.getDaysInactive(null)).toBeNull();
    });

    it('powinien obliczyc liczbe dni nieaktywnosci', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const result = component.getDaysInactive(twoDaysAgo.toISOString().split('T')[0]);
      expect(result).toBe(2);
    });
  });
});
