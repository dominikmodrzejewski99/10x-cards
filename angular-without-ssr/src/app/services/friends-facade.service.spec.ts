import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { FriendsFacadeService } from './friends-facade.service';
import { FriendshipService } from './friendship.service';
import { UserPreferencesService } from './user-preferences.service';
import { ToastService } from '../shared/services/toast.service';
import {
  FriendDTO,
  FriendRequestDTO,
  SentRequestDTO,
  LeaderboardEntryDTO,
  FriendStatsDTO,
  UserPreferencesDTO,
} from '../../types';

describe('FriendsFacadeService', () => {
  let facade: FriendsFacadeService;
  let friendshipMock: jasmine.SpyObj<FriendshipService>;
  let prefsMock: jasmine.SpyObj<UserPreferencesService>;
  let toastMock: jasmine.SpyObj<ToastService>;

  const mockFriend: FriendDTO = {
    friendship_id: 'f1',
    user_id: 'u1',
    email_masked: 'te...@test.com',
    current_streak: 5,
    last_study_date: '2026-03-30',
    total_cards_reviewed: 100,
    last_active_at: null,
  };

  const mockFriend2: FriendDTO = {
    friendship_id: 'f2',
    user_id: 'u2',
    email_masked: 'jo...@test.com',
    current_streak: 3,
    last_study_date: null,
    total_cards_reviewed: 50,
    last_active_at: null,
  };

  const mockRequest: FriendRequestDTO = {
    friendship_id: 'r1',
    user_id: 'u2',
    email_masked: 'jo...@test.com',
    created_at: '2026-04-01T00:00:00Z',
  };

  const mockSentRequest: SentRequestDTO = {
    friendship_id: 's1',
    user_id: 'u3',
    email_masked: 'an...@test.com',
    status: 'pending',
    created_at: '2026-04-07T00:00:00Z',
  };

  const mockLeaderboard: LeaderboardEntryDTO[] = [
    { user_id: 'u1', email_masked: 'te...@test.com', current_streak: 10, total_cards_reviewed: 200, cards_this_week: 15, is_current_user: true },
    { user_id: 'u2', email_masked: 'jo...@test.com', current_streak: 5, total_cards_reviewed: 300, cards_this_week: 30, is_current_user: false },
  ];

  const mockFriendStats: FriendStatsDTO = {
    user_id: 'u1',
    email_masked: 'te...@test.com',
    current_streak: 5,
    longest_streak: 15,
    total_sessions: 30,
    total_cards_reviewed: 300,
    last_study_date: '2026-03-30',
    last_active_at: null,
  };

  const mockPrefs: UserPreferencesDTO = {
    id: 1,
    user_id: 'user-1',
    theme: 'light',
    language: 'pl',
    onboarding_completed: true,
    current_streak: 10,
    longest_streak: 20,
    last_study_date: '2026-04-01',
    total_sessions: 50,
    total_cards_reviewed: 500,
    pomodoro_work_duration: 25,
    pomodoro_break_duration: 5,
    pomodoro_long_break_duration: 15,
    pomodoro_sessions_before_long_break: 4,
    pomodoro_sound_enabled: true,
    pomodoro_notifications_enabled: true,
    pomodoro_focus_reminder_dismissed: false,
    dismissed_dialogs: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  };

  beforeEach(() => {
    friendshipMock = jasmine.createSpyObj<FriendshipService>('FriendshipService', [
      'getFriends', 'getPendingRequests', 'getSentRequests', 'sendRequest',
      'respondToRequest', 'removeFriend', 'sendNudge', 'cancelRequest',
      'getLeaderboard', 'getFriendStats', 'shareDeckToFriend',
    ]);
    prefsMock = jasmine.createSpyObj<UserPreferencesService>('UserPreferencesService', ['getPreferences']);
    toastMock = jasmine.createSpyObj<ToastService>('ToastService', ['add']);

    // Default stubs
    friendshipMock.getFriends.and.returnValue(Promise.resolve([mockFriend]));
    friendshipMock.getPendingRequests.and.returnValue(Promise.resolve([mockRequest]));
    friendshipMock.getSentRequests.and.returnValue(Promise.resolve([mockSentRequest]));
    friendshipMock.getLeaderboard.and.returnValue(Promise.resolve(mockLeaderboard));
    friendshipMock.getFriendStats.and.returnValue(Promise.resolve(mockFriendStats));
    prefsMock.getPreferences.and.returnValue(of(mockPrefs));

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' },
        }),
      ],
      providers: [
        FriendsFacadeService,
        { provide: FriendshipService, useValue: friendshipMock },
        { provide: UserPreferencesService, useValue: prefsMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    facade = TestBed.inject(FriendsFacadeService);
  });

  describe('loadFriendsList', () => {
    it('should load friends, pending requests and sent requests', fakeAsync(() => {
      facade.loadFriendsList();
      tick();

      expect(friendshipMock.getFriends).toHaveBeenCalled();
      expect(friendshipMock.getPendingRequests).toHaveBeenCalled();
      expect(friendshipMock.getSentRequests).toHaveBeenCalled();
      expect(facade.friendsSignal().length).toBe(1);
      expect(facade.pendingRequestsSignal().length).toBe(1);
      expect(facade.sentRequestsSignal().length).toBe(1);
      expect(facade.loadingSignal()).toBeFalse();
    }));

    it('should show error toast on failure', fakeAsync(() => {
      friendshipMock.getFriends.and.returnValue(Promise.reject(new Error('fail')));

      facade.loadFriendsList();
      tick();

      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
      expect(facade.loadingSignal()).toBeFalse();
    }));
  });

  describe('sendRequest', () => {
    it('should send request and refresh sent requests on success', fakeAsync(() => {
      friendshipMock.sendRequest.and.returnValue(Promise.resolve({ friendship_id: 'new', status: 'pending' }));
      facade.setEmailInput('new@test.com');

      facade.sendRequest();
      tick();

      expect(friendshipMock.sendRequest).toHaveBeenCalledWith('new@test.com');
      expect(facade.emailInputSignal()).toBe('');
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    }));

    it('should not send request when email is empty', fakeAsync(() => {
      facade.setEmailInput('  ');

      facade.sendRequest();
      tick();

      expect(friendshipMock.sendRequest).not.toHaveBeenCalled();
    }));

    it('should show error toast on failure', fakeAsync(() => {
      friendshipMock.sendRequest.and.returnValue(Promise.reject({ message: 'Already friends' }));
      facade.setEmailInput('new@test.com');

      facade.sendRequest();
      tick();

      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
    }));
  });

  describe('acceptRequest', () => {
    it('should accept and reload friends list', fakeAsync(() => {
      friendshipMock.respondToRequest.and.returnValue(Promise.resolve());

      facade.acceptRequest('r1');
      tick();

      expect(friendshipMock.respondToRequest).toHaveBeenCalledWith('r1', true);
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
      expect(friendshipMock.getFriends).toHaveBeenCalled();
    }));
  });

  describe('rejectRequest', () => {
    it('should reject and remove from pending list', fakeAsync(() => {
      friendshipMock.respondToRequest.and.returnValue(Promise.resolve());

      // First load to populate pending requests
      facade.loadFriendsList();
      tick();

      facade.rejectRequest('r1');
      tick();

      expect(friendshipMock.respondToRequest).toHaveBeenCalledWith('r1', false);
      expect(facade.pendingRequestsSignal().length).toBe(0);
    }));
  });

  describe('removeFriend', () => {
    it('should remove friend from list on success', fakeAsync(() => {
      friendshipMock.removeFriend.and.returnValue(Promise.resolve());

      facade.loadFriendsList();
      tick();

      facade.removeFriend('f1');
      tick();

      expect(friendshipMock.removeFriend).toHaveBeenCalledWith('f1');
      expect(facade.friendsSignal().length).toBe(0);
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    }));
  });

  describe('sendNudge', () => {
    it('should send nudge and show success toast', fakeAsync(() => {
      friendshipMock.sendNudge.and.returnValue(Promise.resolve());

      facade.sendNudge('u1');
      tick();

      expect(friendshipMock.sendNudge).toHaveBeenCalledWith('u1');
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    }));

    it('should show warning toast on nudge failure', fakeAsync(() => {
      friendshipMock.sendNudge.and.returnValue(Promise.reject({ message: 'Too soon' }));

      facade.sendNudge('u1');
      tick();

      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'warn' }));
    }));
  });

  describe('cancelRequest', () => {
    it('should cancel request and remove from sent list', fakeAsync(() => {
      friendshipMock.cancelRequest.and.returnValue(Promise.resolve());

      facade.loadFriendsList();
      tick();

      facade.cancelRequest('s1');
      tick();

      expect(friendshipMock.cancelRequest).toHaveBeenCalledWith('s1');
      expect(facade.sentRequestsSignal().length).toBe(0);
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    }));
  });

  describe('loadLeaderboard', () => {
    it('should load leaderboard entries on success', fakeAsync(() => {
      facade.loadLeaderboard();
      tick();

      expect(friendshipMock.getLeaderboard).toHaveBeenCalled();
      expect(facade.leaderboardEntriesSignal().length).toBe(2);
      expect(facade.leaderboardLoadingSignal()).toBeFalse();
    }));

    it('should show error toast on failure', fakeAsync(() => {
      friendshipMock.getLeaderboard.and.returnValue(Promise.reject(new Error('fail')));

      facade.loadLeaderboard();
      tick();

      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
      expect(facade.leaderboardLoadingSignal()).toBeFalse();
    }));
  });

  describe('setActiveCategory / sortedEntriesSignal', () => {
    it('should sort by streak by default', fakeAsync(() => {
      facade.loadLeaderboard();
      tick();

      const sorted = facade.sortedEntriesSignal();
      expect(sorted[0].current_streak).toBe(10);
      expect(sorted[1].current_streak).toBe(5);
    }));

    it('should sort by cards_this_week when category changed', fakeAsync(() => {
      facade.loadLeaderboard();
      tick();

      facade.setActiveCategory('cards_this_week');
      const sorted = facade.sortedEntriesSignal();

      expect(sorted[0].cards_this_week).toBe(30);
      expect(sorted[1].cards_this_week).toBe(15);
    }));
  });

  describe('getValueForCategory', () => {
    it('should return value for the active category', () => {
      const entry = mockLeaderboard[0];

      expect(facade.getValueForCategory(entry)).toBe(10); // streak default

      facade.setActiveCategory('cards_this_week');
      expect(facade.getValueForCategory(entry)).toBe(15);

      facade.setActiveCategory('total_cards');
      expect(facade.getValueForCategory(entry)).toBe(200);
    });
  });

  describe('loadFriendStats', () => {
    it('should load friend stats and my stats on success', fakeAsync(() => {
      facade.loadFriendStats('u1');
      tick();

      expect(friendshipMock.getFriendStats).toHaveBeenCalledWith('u1');
      expect(prefsMock.getPreferences).toHaveBeenCalled();
      expect(facade.friendStatsSignal()).toEqual(mockFriendStats);
      expect(facade.myStatsSignal()).toEqual(mockPrefs);
      expect(facade.statsLoadingSignal()).toBeFalse();
      expect(facade.statsErrorSignal()).toBeFalse();
    }));

    it('should set statsError on failure', fakeAsync(() => {
      friendshipMock.getFriendStats.and.returnValue(Promise.reject(new Error('fail')));

      facade.loadFriendStats('u1');
      tick();

      expect(facade.statsErrorSignal()).toBeTrue();
      expect(facade.statsLoadingSignal()).toBeFalse();
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
    }));
  });

  describe('loadShareFriends', () => {
    it('should load friends for sharing', fakeAsync(() => {
      friendshipMock.getFriends.and.returnValue(Promise.resolve([mockFriend, mockFriend2]));

      facade.loadShareFriends();
      tick();

      expect(facade.shareFriendsSignal().length).toBe(2);
      expect(facade.shareLoadingSignal()).toBeFalse();
    }));
  });

  describe('shareToFriend', () => {
    it('should share and mark as shared on success', fakeAsync(() => {
      friendshipMock.shareDeckToFriend.and.returnValue(Promise.resolve('share-id'));

      facade.shareToFriend(42, 'u1');
      tick();

      expect(friendshipMock.shareDeckToFriend).toHaveBeenCalledWith(42, 'u1');
      expect(facade.isShared('u1')).toBeTrue();
      expect(facade.isShared('u2')).toBeFalse();
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    }));

    it('should show error toast on share failure', fakeAsync(() => {
      friendshipMock.shareDeckToFriend.and.returnValue(Promise.reject({ message: 'Not friends' }));

      facade.shareToFriend(42, 'u1');
      tick();

      expect(facade.isShared('u1')).toBeFalse();
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
    }));
  });

  describe('resetShareState', () => {
    it('should clear all share state', fakeAsync(() => {
      friendshipMock.shareDeckToFriend.and.returnValue(Promise.resolve('share-id'));

      facade.shareToFriend(42, 'u1');
      tick();
      expect(facade.isShared('u1')).toBeTrue();

      facade.resetShareState();

      expect(facade.shareFriendsSignal()).toEqual([]);
      expect(facade.isShared('u1')).toBeFalse();
      expect(facade.sharingSignal()).toBeNull();
      expect(facade.shareLoadingSignal()).toBeFalse();
    }));
  });

  describe('getDaysInactive', () => {
    it('should return null when date is null', () => {
      expect(facade.getDaysInactive(null)).toBeNull();
    });

    it('should calculate days since last study date', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const result = facade.getDaysInactive(twoDaysAgo.toISOString().split('T')[0]);
      expect(result).toBe(2);
    });
  });
});
