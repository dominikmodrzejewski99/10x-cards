import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ExploreFacadeService } from './explore-facade.service';
import { ExploreService } from '../api/explore.service';
import { ToastService } from '../../shared/services/toast.service';
import { UserPreferencesService } from '../domain/user-preferences.service';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { BrowsePublicSetsResponse, PublicSetDTO } from '../../../types';

describe('ExploreFacadeService', () => {
  let facade: ExploreFacadeService;
  let exploreServiceMock: jasmine.SpyObj<ExploreService>;
  let toastMock: jasmine.SpyObj<ToastService>;
  let prefsMock: jasmine.SpyObj<UserPreferencesService>;

  const mockSet: PublicSetDTO = {
    id: 1, name: 'Set A', description: 'desc', tags: ['angular'],
    card_count: 10, author_id: 'u1', author_email_masked: 'u***@example.com',
    copy_count: 3, published_at: '2026-01-01T00:00:00Z',
  };

  const mockSet2: PublicSetDTO = {
    id: 2, name: 'Set B', description: null, tags: ['rxjs'],
    card_count: 5, author_id: 'u2', author_email_masked: 'a***@example.com',
    copy_count: 0, published_at: '2026-01-02T00:00:00Z',
  };

  const mockBrowseResponse: BrowsePublicSetsResponse = {
    sets: [mockSet, mockSet2],
    total: 2,
  };

  beforeEach(() => {
    exploreServiceMock = jasmine.createSpyObj<ExploreService>(
      'ExploreService', ['browse', 'getPopularTags', 'copySet'],
    );
    toastMock = jasmine.createSpyObj<ToastService>('ToastService', ['add']);
    prefsMock = jasmine.createSpyObj<UserPreferencesService>(
      'UserPreferencesService', ['isDialogDismissed', 'dismissDialog'],
    );

    // Default stubs
    exploreServiceMock.browse.and.returnValue(of(mockBrowseResponse));
    exploreServiceMock.getPopularTags.and.returnValue(of(['angular', 'rxjs', 'typescript']));
    prefsMock.isDialogDismissed.and.returnValue(of(false));

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' },
        }),
      ],
      providers: [
        ExploreFacadeService,
        { provide: ExploreService, useValue: exploreServiceMock },
        { provide: ToastService, useValue: toastMock },
        { provide: UserPreferencesService, useValue: prefsMock },
      ],
    });

    facade = TestBed.inject(ExploreFacadeService);
  });

  afterEach(() => {
    facade.destroy();
  });

  describe('init', () => {
    it('should set up search subscription, load prefs, load popular tags and load sets', () => {
      facade.init();

      expect(prefsMock.isDialogDismissed).toHaveBeenCalledWith('copy_set_confirm');
      expect(exploreServiceMock.getPopularTags).toHaveBeenCalled();
      expect(exploreServiceMock.browse).toHaveBeenCalled();
      expect(facade.setsSignal().length).toBe(2);
      expect(facade.popularTagsSignal()).toEqual(['angular', 'rxjs', 'typescript']);
    });
  });

  describe('loadPopularTags', () => {
    it('should set popular tags on success', () => {
      facade.loadPopularTags();

      expect(facade.popularTagsSignal()).toEqual(['angular', 'rxjs', 'typescript']);
    });

    it('should silently ignore errors', () => {
      exploreServiceMock.getPopularTags.and.returnValue(throwError(() => new Error('fail')));

      expect(() => facade.loadPopularTags()).not.toThrow();
      expect(facade.popularTagsSignal()).toEqual([]);
    });
  });

  describe('loadSets', () => {
    it('should set sets, total and loading on success', () => {
      facade.loadSets();

      expect(facade.setsSignal()).toEqual([mockSet, mockSet2]);
      expect(facade.totalSignal()).toBe(2);
      expect(facade.loadingSignal()).toBeFalse();
      expect(facade.errorSignal()).toBeNull();
    });

    it('should set error message on failure', () => {
      exploreServiceMock.browse.and.returnValue(throwError(() => new Error('fail')));

      facade.loadSets();

      expect(facade.loadingSignal()).toBeFalse();
      expect(facade.errorSignal()).toBe('Failed to load sets');
    });
  });

  describe('onSearchInput', () => {
    it('should not trigger loadSets immediately (debounced)', fakeAsync(() => {
      facade.init();
      exploreServiceMock.browse.calls.reset();

      facade.onSearchInput('test');

      expect(exploreServiceMock.browse).not.toHaveBeenCalled();

      tick(300);

      expect(exploreServiceMock.browse).toHaveBeenCalled();
      expect(facade.searchSignal()).toBe('test');
      expect(facade.pageSignal()).toBe(1);
    }));

    it('should use distinctUntilChanged to skip duplicate values', fakeAsync(() => {
      facade.init();
      exploreServiceMock.browse.calls.reset();

      facade.onSearchInput('test');
      tick(300);
      exploreServiceMock.browse.calls.reset();

      facade.onSearchInput('test');
      tick(300);

      expect(exploreServiceMock.browse).not.toHaveBeenCalled();
    }));
  });

  describe('toggleTag', () => {
    it('should select tag, reset page and call loadSets', () => {
      facade.toggleTag('angular');

      expect(facade.selectedTagsSignal()).toEqual(['angular']);
      expect(facade.pageSignal()).toBe(1);
      expect(exploreServiceMock.browse).toHaveBeenCalled();
    });

    it('should deselect tag if already selected', () => {
      facade.toggleTag('angular');
      exploreServiceMock.browse.calls.reset();

      facade.toggleTag('angular');

      expect(facade.selectedTagsSignal()).toEqual([]);
      expect(exploreServiceMock.browse).toHaveBeenCalled();
    });
  });

  describe('clearTags', () => {
    it('should clear selected tags, reset page and call loadSets', () => {
      facade.toggleTag('angular');
      exploreServiceMock.browse.calls.reset();

      facade.clearTags();

      expect(facade.selectedTagsSignal()).toEqual([]);
      expect(facade.pageSignal()).toBe(1);
      expect(exploreServiceMock.browse).toHaveBeenCalled();
    });
  });

  describe('onSortChange', () => {
    it('should update sort, reset page and call loadSets', () => {
      facade.onSortChange('newest');

      expect(facade.sortSignal()).toBe('newest');
      expect(facade.pageSignal()).toBe(1);
      expect(exploreServiceMock.browse).toHaveBeenCalled();
    });
  });

  describe('onPageChange', () => {
    it('should update page and call loadSets', () => {
      facade.onPageChange(3);

      expect(facade.pageSignal()).toBe(3);
      expect(exploreServiceMock.browse).toHaveBeenCalled();
    });
  });

  describe('requestCopy', () => {
    it('should show dialog when skipCopyConfirm is false', () => {
      prefsMock.isDialogDismissed.and.returnValue(of(false));
      facade.init();

      facade.requestCopy(1);

      expect(facade.copyDialogVisibleSignal()).toBeTrue();
      expect(facade.copyDialogRememberSignal()).toBeFalse();
      expect(exploreServiceMock.copySet).not.toHaveBeenCalled();
    });

    it('should copy directly when skipCopyConfirm is true', () => {
      prefsMock.isDialogDismissed.and.returnValue(of(true));
      exploreServiceMock.copySet.and.returnValue(of(1));
      facade.init();

      facade.requestCopy(1);

      expect(facade.copyDialogVisibleSignal()).toBeFalse();
      expect(exploreServiceMock.copySet).toHaveBeenCalledWith(1);
    });
  });

  describe('confirmCopy', () => {
    it('should hide dialog and execute copy', () => {
      prefsMock.isDialogDismissed.and.returnValue(of(false));
      exploreServiceMock.copySet.and.returnValue(of(1));
      facade.init();

      facade.requestCopy(1);
      facade.confirmCopy();

      expect(facade.copyDialogVisibleSignal()).toBeFalse();
      expect(exploreServiceMock.copySet).toHaveBeenCalledWith(1);
    });

    it('should dismiss dialog preference when remember is toggled', () => {
      prefsMock.isDialogDismissed.and.returnValue(of(false));
      prefsMock.dismissDialog.and.returnValue(of({} as any));
      exploreServiceMock.copySet.and.returnValue(of(1));
      facade.init();

      facade.requestCopy(1);
      facade.toggleCopyDialogRemember();
      facade.confirmCopy();

      expect(prefsMock.dismissDialog).toHaveBeenCalledWith('copy_set_confirm');
      expect(exploreServiceMock.copySet).toHaveBeenCalledWith(1);
    });

    it('should show success toast and increment copy_count on success', () => {
      prefsMock.isDialogDismissed.and.returnValue(of(false));
      exploreServiceMock.copySet.and.returnValue(of(1));
      facade.init();

      facade.requestCopy(1);
      facade.confirmCopy();

      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
      expect(facade.setsSignal().find(s => s.id === 1)!.copy_count).toBe(4);
    });

    it('should show error toast on copy failure', () => {
      prefsMock.isDialogDismissed.and.returnValue(of(false));
      exploreServiceMock.copySet.and.returnValue(throwError(() => new Error('Server error')));
      facade.init();

      facade.requestCopy(1);
      facade.confirmCopy();

      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
    });

    it('should show specific error for copying own set', () => {
      prefsMock.isDialogDismissed.and.returnValue(of(false));
      exploreServiceMock.copySet.and.returnValue(
        throwError(() => ({ message: 'Cannot copy your own set' })),
      );
      facade.init();

      facade.requestCopy(1);
      facade.confirmCopy();

      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
    });

    it('should do nothing if no pending set id', () => {
      facade.confirmCopy();

      expect(exploreServiceMock.copySet).not.toHaveBeenCalled();
    });
  });

  describe('cancelCopy', () => {
    it('should hide dialog and clear pending set id', () => {
      prefsMock.isDialogDismissed.and.returnValue(of(false));
      facade.init();

      facade.requestCopy(1);
      facade.cancelCopy();

      expect(facade.copyDialogVisibleSignal()).toBeFalse();

      // Confirm after cancel should not copy
      facade.confirmCopy();
      expect(exploreServiceMock.copySet).not.toHaveBeenCalled();
    });
  });

  describe('toggleCopyDialogRemember', () => {
    it('should toggle the remember flag', () => {
      expect(facade.copyDialogRememberSignal()).toBeFalse();

      facade.toggleCopyDialogRemember();
      expect(facade.copyDialogRememberSignal()).toBeTrue();

      facade.toggleCopyDialogRemember();
      expect(facade.copyDialogRememberSignal()).toBeFalse();
    });
  });

  describe('destroy', () => {
    it('should unsubscribe from search subscription', fakeAsync(() => {
      facade.init();
      facade.destroy();
      exploreServiceMock.browse.calls.reset();

      facade.onSearchInput('test');
      tick(300);

      // After destroy, the subscription is unsubscribed so browse should not be called
      expect(exploreServiceMock.browse).not.toHaveBeenCalled();
    }));
  });
});
