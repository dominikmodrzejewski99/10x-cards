import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { SupabaseClientFactory } from './supabase-client.factory';

describe('NotificationService', () => {
  let service: NotificationService;

  const createChainMock = (finalResult: unknown) => {
    const chain: Record<string, jasmine.Spy> = {};
    chain['select'] = jasmine.createSpy('select').and.returnValue(chain);
    chain['eq'] = jasmine.createSpy('eq').and.returnValue(chain);
    chain['order'] = jasmine.createSpy('order').and.returnValue(chain);
    chain['limit'] = jasmine.createSpy('limit').and.returnValue(Promise.resolve(finalResult));
    chain['update'] = jasmine.createSpy('update').and.returnValue(chain);
    return chain;
  };

  const mockSupabaseClient = {
    from: jasmine.createSpy('from'),
    auth: {
      getUser: jasmine.createSpy('getUser').and.returnValue(
        Promise.resolve({ data: { user: { id: 'user-1' } } })
      )
    }
  };

  const mockFactory = {
    getClient: () => mockSupabaseClient
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: SupabaseClientFactory, useValue: mockFactory }
      ]
    });
    service = TestBed.inject(NotificationService);
    mockSupabaseClient.from.calls.reset();
    mockSupabaseClient.auth.getUser.calls.reset();
    mockSupabaseClient.auth.getUser.and.returnValue(
      Promise.resolve({ data: { user: { id: 'user-1' } } })
    );
  });

  it('powinien zostac utworzony', () => {
    expect(service).toBeTruthy();
  });

  describe('getNotifications', () => {
    it('powinien pobrac notyfikacje uzytkownika', async () => {
      const mockNotifications = [
        { id: 'n1', type: 'friend_request', read: false, created_at: '2026-04-01' }
      ];
      const chain = createChainMock({ data: mockNotifications, error: null });
      mockSupabaseClient.from.and.returnValue(chain);

      const result = await service.getNotifications();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('n1');
    });

    it('powinien rzucic blad gdy uzytkownik niezalogowany', async () => {
      mockSupabaseClient.auth.getUser.and.returnValue(
        Promise.resolve({ data: { user: null } })
      );

      await expectAsync(service.getNotifications()).toBeRejectedWithError('Not authenticated');
    });
  });

  describe('getUnreadCount', () => {
    it('powinien zwrocic liczbe nieprzeczytanych', async () => {
      const eqResult = Promise.resolve({ count: 5, error: null });
      const chain: Record<string, jasmine.Spy> = {};
      chain['select'] = jasmine.createSpy('select').and.returnValue(chain);
      chain['eq'] = jasmine.createSpy('eq').and.returnValues(chain, eqResult);
      mockSupabaseClient.from.and.returnValue(chain);

      const result = await service.getUnreadCount();

      expect(result).toBe(5);
    });

    it('powinien zwrocic 0 gdy brak nieprzeczytanych', async () => {
      const eqResult = Promise.resolve({ count: 0, error: null });
      const chain: Record<string, jasmine.Spy> = {};
      chain['select'] = jasmine.createSpy('select').and.returnValue(chain);
      chain['eq'] = jasmine.createSpy('eq').and.returnValues(chain, eqResult);
      mockSupabaseClient.from.and.returnValue(chain);

      const result = await service.getUnreadCount();

      expect(result).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('powinien zaktualizowac notyfikacje jako przeczytana', async () => {
      const chain = createChainMock({ error: null });
      chain['update'] = jasmine.createSpy('update').and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue(Promise.resolve({ error: null }))
      });
      mockSupabaseClient.from.and.returnValue(chain);

      await service.markAsRead('n1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications');
      expect(chain['update']).toHaveBeenCalledWith({ read: true });
    });
  });

  describe('markAllAsRead', () => {
    it('powinien oznaczyc wszystkie jako przeczytane', async () => {
      const eqMock = jasmine.createSpy('eq').and.returnValue(Promise.resolve({ error: null }));
      const chain: Record<string, jasmine.Spy> = {};
      chain['update'] = jasmine.createSpy('update').and.returnValue({
        eq: jasmine.createSpy('eq').and.returnValue({
          eq: eqMock
        })
      });
      mockSupabaseClient.from.and.returnValue(chain);

      await service.markAllAsRead();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications');
      expect(chain['update']).toHaveBeenCalledWith({ read: true });
    });
  });
});
