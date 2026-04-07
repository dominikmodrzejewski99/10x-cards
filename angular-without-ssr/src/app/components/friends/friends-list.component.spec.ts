import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { ToastService } from '../../shared/services/toast.service';
import { FriendsListComponent } from './friends-list.component';
import { FriendshipService } from '../../services/friendship.service';
import { FriendDTO, FriendRequestDTO, SentRequestDTO } from '../../../types';

describe('FriendsListComponent', () => {
  let component: FriendsListComponent;
  let fixture: ComponentFixture<FriendsListComponent>;
  let friendshipServiceMock: jasmine.SpyObj<FriendshipService>;
  let messageServiceMock: jasmine.SpyObj<ToastService>;

  const mockFriend: FriendDTO = {
    friendship_id: 'f1',
    user_id: 'u1',
    email_masked: 'te...@test.com',
    current_streak: 5,
    last_study_date: '2026-03-30',
    total_cards_reviewed: 100,
    last_active_at: null
  };

  const mockRequest: FriendRequestDTO = {
    friendship_id: 'r1',
    user_id: 'u2',
    email_masked: 'jo...@test.com',
    created_at: '2026-04-01T00:00:00Z'
  };

  const mockSentRequest: SentRequestDTO = {
    friendship_id: 's1',
    user_id: 'u3',
    email_masked: 'an...@test.com',
    status: 'pending',
    created_at: '2026-04-07T00:00:00Z'
  };

  beforeEach(async () => {
    friendshipServiceMock = jasmine.createSpyObj('FriendshipService', [
      'getFriends', 'getPendingRequests', 'getSentRequests', 'sendRequest', 'respondToRequest', 'removeFriend', 'sendNudge', 'cancelRequest'
    ]);
    messageServiceMock = jasmine.createSpyObj('ToastService', ['add']);

    friendshipServiceMock.getFriends.and.returnValue(Promise.resolve([mockFriend]));
    friendshipServiceMock.getPendingRequests.and.returnValue(Promise.resolve([mockRequest]));
    friendshipServiceMock.getSentRequests.and.returnValue(Promise.resolve([mockSentRequest]));

    await TestBed.configureTestingModule({
      imports: [
        FriendsListComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' }
        })
      ],
      providers: [
        { provide: FriendshipService, useValue: friendshipServiceMock }
      ]
    })
    .overrideComponent(FriendsListComponent, {
      set: { providers: [{ provide: ToastService, useValue: messageServiceMock }] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(FriendsListComponent);
    component = fixture.componentInstance;
  });

  it('powinien utworzyc komponent', () => {
    expect(component).toBeTruthy();
  });

  it('powinien zaladowac znajomych, zaproszenia i wyslane przy init', async () => {
    await component.loadData();

    expect(friendshipServiceMock.getFriends).toHaveBeenCalled();
    expect(friendshipServiceMock.getPendingRequests).toHaveBeenCalled();
    expect(friendshipServiceMock.getSentRequests).toHaveBeenCalled();
    expect(component.friends().length).toBe(1);
    expect(component.pendingRequests().length).toBe(1);
    expect(component.sentRequests().length).toBe(1);
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
    friendshipServiceMock.getSentRequests.and.returnValue(Promise.resolve([]));

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

  it('powinien anulowac wyslane zaproszenie', async () => {
    component.sentRequests.set([mockSentRequest]);
    friendshipServiceMock.cancelRequest.and.returnValue(Promise.resolve());

    await component.cancelRequest('s1');

    expect(friendshipServiceMock.cancelRequest).toHaveBeenCalledWith('s1');
    expect(component.sentRequests().length).toBe(0);
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
