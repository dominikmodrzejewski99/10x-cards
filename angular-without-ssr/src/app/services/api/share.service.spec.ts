import { TestBed } from '@angular/core/testing';
import { ShareService } from './share.service';
import { SupabaseClientFactory } from '../infrastructure/supabase-client.factory';
import { ShareLinkDTO } from '../../../types';

interface MockQueryBuilder {
  select: jasmine.Spy;
  insert: jasmine.Spy;
  single: jasmine.Spy;
}

interface MockSupabaseClient {
  auth: {
    getUser: jasmine.Spy;
  };
  from: jasmine.Spy;
  rpc: jasmine.Spy;
}

const MOCK_USER_ID = 'user-share-123';
const MOCK_LINK_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const MOCK_SET_ID = 42;

function createMockQueryBuilder(resolvedValue: { data: unknown; error: unknown }): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    select: jasmine.createSpy('select'),
    insert: jasmine.createSpy('insert'),
    single: jasmine.createSpy('single'),
  };

  const chainable: MockQueryBuilder & PromiseLike<{ data: unknown; error: unknown }> = {
    ...builder,
    then(
      onfulfilled?: ((value: { data: unknown; error: unknown }) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null
    ): Promise<unknown> {
      return Promise.resolve(resolvedValue).then(onfulfilled, onrejected);
    }
  } as MockQueryBuilder & PromiseLike<{ data: unknown; error: unknown }>;

  for (const key of Object.keys(builder) as Array<keyof MockQueryBuilder>) {
    (chainable[key] as jasmine.Spy).and.returnValue(chainable);
  }

  return chainable;
}

function makeMockShareLink(overrides: Partial<ShareLinkDTO> = {}): ShareLinkDTO {
  return {
    id: MOCK_LINK_ID,
    set_id: MOCK_SET_ID,
    created_by: MOCK_USER_ID,
    expires_at: '2026-04-04T00:00:00Z',
    created_at: '2026-03-28T00:00:00Z',
    ...overrides
  };
}

describe('ShareService', () => {
  let service: ShareService;
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jasmine.createSpy('getUser').and.returnValue(
          Promise.resolve({ data: { user: { id: MOCK_USER_ID } }, error: null })
        )
      },
      from: jasmine.createSpy('from'),
      rpc: jasmine.createSpy('rpc')
    };

    TestBed.configureTestingModule({
      providers: [
        ShareService,
        { provide: SupabaseClientFactory, useValue: { getClient: (): MockSupabaseClient => mockSupabase } }
      ]
    });

    service = TestBed.inject(ShareService);
  });

  describe('createShareLink', () => {
    it('should return a ShareLinkDTO on success', async () => {
      const mockLink: ShareLinkDTO = makeMockShareLink();
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({ data: mockLink, error: null });
      mockSupabase.from.and.returnValue(queryBuilder);

      const result = await service.createShareLink(MOCK_SET_ID);

      expect(result).toEqual(mockLink);
      expect(mockSupabase.from).toHaveBeenCalledWith('share_links');
      expect(queryBuilder.insert).toHaveBeenCalledWith(
        jasmine.objectContaining({ set_id: MOCK_SET_ID, created_by: MOCK_USER_ID })
      );
      expect(queryBuilder.select).toHaveBeenCalled();
      expect(queryBuilder.single).toHaveBeenCalled();
    });

    it('should throw when user is not authenticated', async () => {
      mockSupabase.auth.getUser.and.returnValue(
        Promise.resolve({ data: { user: null }, error: null })
      );

      await expectAsync(service.createShareLink(MOCK_SET_ID)).toBeRejectedWithError('Not authenticated');
    });

    it('should throw on supabase error', async () => {
      const queryBuilder: MockQueryBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'DB insert failed' }
      });
      mockSupabase.from.and.returnValue(queryBuilder);

      await expectAsync(service.createShareLink(MOCK_SET_ID)).toBeRejectedWith(
        jasmine.objectContaining({ message: 'DB insert failed' })
      );
    });
  });

  describe('acceptShareLink', () => {
    it('should call rpc with link_id and return new set id', async () => {
      const newSetId = 99;
      mockSupabase.rpc.and.returnValue(
        Promise.resolve({ data: newSetId, error: null })
      );

      const result = await service.acceptShareLink(MOCK_LINK_ID);

      expect(result).toBe(newSetId);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('accept_share_link', { link_id: MOCK_LINK_ID });
    });

    it('should throw on supabase error', async () => {
      mockSupabase.rpc.and.returnValue(
        Promise.resolve({ data: null, error: { message: 'Link expired' } })
      );

      await expectAsync(service.acceptShareLink(MOCK_LINK_ID)).toBeRejectedWith(
        jasmine.objectContaining({ message: 'Link expired' })
      );
    });
  });

  describe('buildShareUrl', () => {
    it('should return correct URL with window.location.origin and link id', () => {
      const result = service.buildShareUrl(MOCK_LINK_ID);

      expect(result).toBe(`${window.location.origin}/share/${MOCK_LINK_ID}`);
    });
  });
});
