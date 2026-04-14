import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SetsFacadeService } from './sets-facade.service';
import { FlashcardSetApiService } from '../api/flashcard-set-api.service';
import { ExploreService } from '../api/explore.service';
import { ToastService } from '../../shared/services/toast.service';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { FlashcardSetDTO } from '../../../types';

describe('SetsFacadeService', () => {
  let facade: SetsFacadeService;
  let setApiMock: jasmine.SpyObj<FlashcardSetApiService>;
  let exploreMock: jasmine.SpyObj<ExploreService>;
  let toastMock: jasmine.SpyObj<ToastService>;

  const mockSet: FlashcardSetDTO = {
    id: 1, user_id: 'u1', name: 'Set A', description: 'desc', tags: ['a'],
    is_public: false, copy_count: 0, published_at: null, original_author_id: 'u1', source_set_id: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  };

  const mockSet2: FlashcardSetDTO = {
    id: 2, user_id: 'u1', name: 'Set B', description: null, tags: [],
    is_public: false, copy_count: 0, published_at: null, original_author_id: 'u1', source_set_id: null,
    created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
  };

  beforeEach(() => {
    setApiMock = jasmine.createSpyObj<FlashcardSetApiService>(
      'FlashcardSetApiService', ['getSets', 'createSet', 'updateSet', 'deleteSet']
    );
    exploreMock = jasmine.createSpyObj<ExploreService>(
      'ExploreService', ['publishSet', 'unpublishSet']
    );
    toastMock = jasmine.createSpyObj<ToastService>('ToastService', ['add']);

    TestBed.configureTestingModule({
      imports: [TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' } })],
      providers: [
        SetsFacadeService,
        { provide: FlashcardSetApiService, useValue: setApiMock },
        { provide: ExploreService, useValue: exploreMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    facade = TestBed.inject(SetsFacadeService);
  });

  describe('loadSets', () => {
    it('should load sets into signal', () => {
      setApiMock.getSets.and.returnValue(of([mockSet, mockSet2]));

      facade.loadSets();

      expect(facade.setsSignal().length).toBe(2);
      expect(facade.loadingSignal()).toBeFalse();
      expect(facade.errorSignal()).toBeNull();
    });

    it('should set error on failure', () => {
      setApiMock.getSets.and.returnValue(throwError(() => new Error('fail')));

      facade.loadSets();

      expect(facade.loadingSignal()).toBeFalse();
      expect(facade.errorSignal()).toBeTruthy();
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
    });
  });

  describe('createSet', () => {
    it('should prepend created set', () => {
      setApiMock.getSets.and.returnValue(of([mockSet]));
      facade.loadSets();

      const created: FlashcardSetDTO = { ...mockSet2, id: 3, name: 'New' };
      setApiMock.createSet.and.returnValue(of(created));

      facade.createSet({ name: 'New' });

      expect(facade.setsSignal().length).toBe(2);
      expect(facade.setsSignal()[0].name).toBe('New');
      expect(facade.savingSignal()).toBeFalse();
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    });

    it('should handle create error', () => {
      setApiMock.createSet.and.returnValue(throwError(() => new Error('fail')));

      facade.createSet({ name: 'X' });

      expect(facade.savingSignal()).toBeFalse();
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
    });
  });

  describe('updateSet', () => {
    it('should update set in list', () => {
      setApiMock.getSets.and.returnValue(of([mockSet]));
      facade.loadSets();

      const updated: FlashcardSetDTO = { ...mockSet, name: 'Updated' };
      setApiMock.updateSet.and.returnValue(of(updated));

      facade.updateSet(1, { name: 'Updated' });

      expect(facade.setsSignal()[0].name).toBe('Updated');
      expect(facade.savingSignal()).toBeFalse();
    });
  });

  describe('deleteSet', () => {
    it('should remove set from list', () => {
      setApiMock.getSets.and.returnValue(of([mockSet, mockSet2]));
      facade.loadSets();

      setApiMock.deleteSet.and.returnValue(of(undefined));
      facade.deleteSet(1);

      expect(facade.setsSignal().length).toBe(1);
      expect(facade.setsSignal()[0].id).toBe(2);
    });

    it('should handle delete error', () => {
      setApiMock.getSets.and.returnValue(of([mockSet]));
      facade.loadSets();

      setApiMock.deleteSet.and.returnValue(throwError(() => new Error('fail')));
      facade.deleteSet(1);

      expect(facade.loadingSignal()).toBeFalse();
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
    });
  });

  describe('publishSet', () => {
    it('should mark set as public', () => {
      setApiMock.getSets.and.returnValue(of([mockSet]));
      facade.loadSets();

      exploreMock.publishSet.and.returnValue(of(undefined as unknown as void));
      facade.publishSet(1);

      expect(facade.setsSignal()[0].is_public).toBeTrue();
    });
  });

  describe('unpublishSet', () => {
    it('should mark set as not public', () => {
      const publicSet: FlashcardSetDTO = { ...mockSet, is_public: true };
      setApiMock.getSets.and.returnValue(of([publicSet]));
      facade.loadSets();

      exploreMock.unpublishSet.and.returnValue(of(undefined as unknown as void));
      facade.unpublishSet(1);

      expect(facade.setsSignal()[0].is_public).toBeFalse();
    });
  });
});
