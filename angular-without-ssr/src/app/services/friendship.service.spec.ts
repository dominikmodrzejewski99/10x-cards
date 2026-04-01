import { TestBed } from '@angular/core/testing';
import { FriendshipService } from './friendship.service';
import { SupabaseClientFactory } from './supabase-client.factory';

describe('FriendshipService', () => {
  let service: FriendshipService;
  let rpcSpy: jasmine.Spy;
  let fromSpy: jasmine.Spy;
  let authSpy: jasmine.Spy;

  const mockSupabaseClient = {
    rpc: jasmine.createSpy('rpc'),
    from: jasmine.createSpy('from'),
    auth: {
      getUser: jasmine.createSpy('getUser')
    }
  };

  const mockFactory = {
    getClient: () => mockSupabaseClient
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FriendshipService,
        { provide: SupabaseClientFactory, useValue: mockFactory }
      ]
    });
    service = TestBed.inject(FriendshipService);
    rpcSpy = mockSupabaseClient.rpc;
    fromSpy = mockSupabaseClient.from;
    authSpy = mockSupabaseClient.auth.getUser;

    rpcSpy.calls.reset();
    fromSpy.calls.reset();
    authSpy.calls.reset();
  });

  it('powinien zostac utworzony', () => {
    expect(service).toBeTruthy();
  });

  describe('sendRequest', () => {
    it('powinien wywolac RPC send_friend_request z emailem', async () => {
      rpcSpy.and.returnValue(Promise.resolve({
        data: { friendship_id: 'abc', status: 'pending' },
        error: null
      }));

      const result = await service.sendRequest('test@example.com');

      expect(rpcSpy).toHaveBeenCalledWith('send_friend_request', { target_email: 'test@example.com' });
      expect(result.friendship_id).toBe('abc');
      expect(result.status).toBe('pending');
    });

    it('powinien trimowac email', async () => {
      rpcSpy.and.returnValue(Promise.resolve({ data: { friendship_id: 'abc', status: 'pending' }, error: null }));

      await service.sendRequest('  test@example.com  ');

      expect(rpcSpy).toHaveBeenCalledWith('send_friend_request', { target_email: 'test@example.com' });
    });

    it('powinien rzucic blad gdy RPC zwroci error', async () => {
      const error = { message: 'User not found' };
      rpcSpy.and.returnValue(Promise.resolve({ data: null, error }));

      await expectAsync(service.sendRequest('missing@example.com')).toBeRejectedWith(error);
    });
  });

  describe('respondToRequest', () => {
    it('powinien wywolac RPC z accepted gdy accept=true', async () => {
      rpcSpy.and.returnValue(Promise.resolve({ data: null, error: null }));

      await service.respondToRequest('friend-123', true);

      expect(rpcSpy).toHaveBeenCalledWith('respond_to_friend_request', {
        p_friendship_id: 'friend-123',
        p_response: 'accepted'
      });
    });

    it('powinien wywolac RPC z rejected gdy accept=false', async () => {
      rpcSpy.and.returnValue(Promise.resolve({ data: null, error: null }));

      await service.respondToRequest('friend-123', false);

      expect(rpcSpy).toHaveBeenCalledWith('respond_to_friend_request', {
        p_friendship_id: 'friend-123',
        p_response: 'rejected'
      });
    });
  });

  describe('getPendingRequests', () => {
    it('powinien wywolac RPC get_pending_requests', async () => {
      const mockRequests = [
        { friendship_id: 'r1', user_id: 'u2', email_masked: 'jo...@test.com', created_at: '2026-04-01' }
      ];
      rpcSpy.and.returnValue(Promise.resolve({ data: mockRequests, error: null }));

      const result = await service.getPendingRequests();

      expect(rpcSpy).toHaveBeenCalledWith('get_pending_requests');
      expect(result.length).toBe(1);
      expect(result[0].email_masked).toBe('jo...@test.com');
    });
  });

  describe('getFriends', () => {
    it('powinien wywolac RPC get_friends_list', async () => {
      const mockFriends = [
        { friendship_id: '1', user_id: 'u1', email_masked: 'te...@test.com', current_streak: 5, last_study_date: null, total_cards_reviewed: 100 }
      ];
      rpcSpy.and.returnValue(Promise.resolve({ data: mockFriends, error: null }));

      const result = await service.getFriends();

      expect(rpcSpy).toHaveBeenCalledWith('get_friends_list');
      expect(result.length).toBe(1);
      expect(result[0].email_masked).toBe('te...@test.com');
    });

    it('powinien zwrocic pusta tablice gdy brak znajomych', async () => {
      rpcSpy.and.returnValue(Promise.resolve({ data: [], error: null }));

      const result = await service.getFriends();

      expect(result).toEqual([]);
    });
  });

  describe('getFriendStats', () => {
    it('powinien wywolac RPC get_friend_stats z userId', async () => {
      const mockStats = {
        user_id: 'u1',
        email_masked: 'te...@test.com',
        current_streak: 10,
        longest_streak: 20,
        total_sessions: 50,
        total_cards_reviewed: 500,
        last_study_date: '2026-04-01'
      };
      rpcSpy.and.returnValue(Promise.resolve({ data: mockStats, error: null }));

      const result = await service.getFriendStats('u1');

      expect(rpcSpy).toHaveBeenCalledWith('get_friend_stats', { p_friend_user_id: 'u1' });
      expect(result.current_streak).toBe(10);
    });
  });

  describe('removeFriend', () => {
    it('powinien usunac friendship po id', async () => {
      const deleteMock = { eq: jasmine.createSpy('eq').and.returnValue(Promise.resolve({ error: null })) };
      const fromResult = { delete: jasmine.createSpy('delete').and.returnValue(deleteMock) };
      fromSpy.and.returnValue(fromResult);

      await service.removeFriend('friend-123');

      expect(fromSpy).toHaveBeenCalledWith('friendships');
      expect(fromResult.delete).toHaveBeenCalled();
      expect(deleteMock.eq).toHaveBeenCalledWith('id', 'friend-123');
    });
  });

  describe('sendNudge', () => {
    it('powinien wywolac RPC send_nudge', async () => {
      rpcSpy.and.returnValue(Promise.resolve({ data: null, error: null }));

      await service.sendNudge('user-456');

      expect(rpcSpy).toHaveBeenCalledWith('send_nudge', { p_friend_user_id: 'user-456' });
    });

    it('powinien rzucic blad gdy rate limited', async () => {
      const error = { message: 'Nudge already sent in last 24 hours' };
      rpcSpy.and.returnValue(Promise.resolve({ data: null, error }));

      await expectAsync(service.sendNudge('user-456')).toBeRejectedWith(error);
    });
  });
});
