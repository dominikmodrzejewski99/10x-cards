import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { FlashcardsFacadeService } from './flashcards-facade.service';
import { FlashcardApiService } from '../api/flashcard-api.service';
import { FlashcardSetApiService } from '../api/flashcard-set-api.service';
import { FlashcardExportService } from '../domain/flashcard-export.service';
import { PrintTestService } from '../domain/print-test.service';
import { ToastService } from '../../shared/services/toast.service';
import { FlashcardDTO, FlashcardSetDTO } from '../../../types';

describe('FlashcardsFacadeService', () => {
  let facade: FlashcardsFacadeService;
  let flashcardApiMock: jasmine.SpyObj<FlashcardApiService>;
  let setApiMock: jasmine.SpyObj<FlashcardSetApiService>;
  let exportMock: jasmine.SpyObj<FlashcardExportService>;
  let printMock: jasmine.SpyObj<PrintTestService>;
  let toastMock: jasmine.SpyObj<ToastService>;

  const mockFlashcard: FlashcardDTO = {
    id: 1, front: 'Hello', back: 'Cześć', front_image_url: null, back_audio_url: null,
    front_language: 'en', back_language: 'pl', source: 'manual',
    created_at: '', updated_at: '', user_id: 'u1', generation_id: null, set_id: 1, position: 0
  };

  const mockSet: FlashcardSetDTO = {
    id: 1, user_id: 'u1', name: 'English', description: null, tags: [],
    is_public: false, copy_count: 0, published_at: null, original_author_id: 'u1', source_set_id: null,
    created_at: '', updated_at: ''
  };

  beforeEach(() => {
    flashcardApiMock = jasmine.createSpyObj<FlashcardApiService>('FlashcardApiService', [
      'getFlashcards', 'getAllFlashcardsForSet', 'createFlashcard', 'createFlashcards',
      'updateFlashcard', 'deleteFlashcard', 'reorderFlashcards'
    ]);
    setApiMock = jasmine.createSpyObj<FlashcardSetApiService>('FlashcardSetApiService', ['getSet']);
    exportMock = jasmine.createSpyObj<FlashcardExportService>('FlashcardExportService', ['exportToCsv', 'exportToJson']);
    printMock = jasmine.createSpyObj<PrintTestService>('PrintTestService', ['generateAndPrint']);
    toastMock = jasmine.createSpyObj<ToastService>('ToastService', ['add']);

    setApiMock.getSet.and.returnValue(of(mockSet));
    flashcardApiMock.getFlashcards.and.returnValue(of({ flashcards: [mockFlashcard], totalRecords: 1 }));

    TestBed.configureTestingModule({
      imports: [TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' } })],
      providers: [
        FlashcardsFacadeService,
        { provide: FlashcardApiService, useValue: flashcardApiMock },
        { provide: FlashcardSetApiService, useValue: setApiMock },
        { provide: FlashcardExportService, useValue: exportMock },
        { provide: PrintTestService, useValue: printMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    facade = TestBed.inject(FlashcardsFacadeService);
  });

  describe('initForSet', () => {
    it('should load set name and flashcards', () => {
      facade.initForSet(1);

      expect(facade.setIdSignal()).toBe(1);
      expect(facade.setNameSignal()).toBe('English');
      expect(facade.flashcardsSignal().length).toBe(1);
      expect(facade.loadingSignal()).toBeFalse();
    });

    it('should set needsAuthRedirect when set not found', () => {
      setApiMock.getSet.and.returnValue(throwError(() => new Error('Not found')));

      facade.initForSet(999);

      expect(facade.needsAuthRedirectSignal()).toBeTrue();
    });
  });

  describe('loadFlashcards', () => {
    it('should handle error', () => {
      flashcardApiMock.getFlashcards.and.returnValue(throwError(() => new Error('fail')));

      facade.initForSet(1);

      expect(facade.loadingSignal()).toBeFalse();
      expect(facade.errorSignal()).toBeTruthy();
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
    });
  });

  describe('CRUD operations', () => {
    beforeEach(() => {
      facade.initForSet(1);
    });

    it('should open add modal', () => {
      facade.openAddModal();
      expect(facade.isFormModalVisibleSignal()).toBeTrue();
      expect(facade.flashcardBeingEditedSignal()).toBeNull();
    });

    it('should open edit modal', () => {
      facade.openEditModal(mockFlashcard);
      expect(facade.isFormModalVisibleSignal()).toBeTrue();
      expect(facade.flashcardBeingEditedSignal()).toEqual(mockFlashcard);
    });

    it('should close form modal', () => {
      facade.openAddModal();
      facade.closeFormModal();
      expect(facade.isFormModalVisibleSignal()).toBeFalse();
    });

    it('should save (create) flashcard', () => {
      flashcardApiMock.createFlashcard.and.returnValue(of(mockFlashcard));
      facade.saveFlashcard({ front: 'Hi', back: 'Hej', front_image_url: null, front_language: null, back_language: null, back_audio_url: null });
      expect(flashcardApiMock.createFlashcard).toHaveBeenCalled();
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    });

    it('should save (update) flashcard', () => {
      const updated: FlashcardDTO = { ...mockFlashcard, front: 'Updated' };
      flashcardApiMock.updateFlashcard.and.returnValue(of(updated));
      facade.saveFlashcard({ id: 1, front: 'Updated', back: 'Cześć', front_image_url: null, front_language: null, back_language: null, back_audio_url: null });
      expect(flashcardApiMock.updateFlashcard).toHaveBeenCalled();
      expect(facade.flashcardsSignal()[0].front).toBe('Updated');
    });

    it('should delete flashcard', () => {
      flashcardApiMock.deleteFlashcard.and.returnValue(of(undefined as unknown as void));
      facade.deleteFlashcard(mockFlashcard);
      expect(flashcardApiMock.deleteFlashcard).toHaveBeenCalledWith(1);
    });
  });

  describe('search and pagination', () => {
    beforeEach(() => {
      facade.initForSet(1);
    });

    it('should update search term and reload', () => {
      facade.onSearch('hello');
      expect(facade.searchTermSignal()).toBe('hello');
      expect(facade.firstSignal()).toBe(0);
    });

    it('should update rows on change', () => {
      facade.onRowsChange(25);
      expect(facade.rowsSignal()).toBe(25);
    });
  });

  describe('import/export', () => {
    beforeEach(() => {
      facade.initForSet(1);
    });

    it('should open/close import modal', () => {
      facade.openImportModal();
      expect(facade.isImportModalVisibleSignal()).toBeTrue();
      facade.closeImportModal();
      expect(facade.isImportModalVisibleSignal()).toBeFalse();
    });

    it('should import flashcards', () => {
      flashcardApiMock.createFlashcards.and.returnValue(of([mockFlashcard]));
      facade.importFlashcards([{ front: 'a', back: 'b', source: 'manual' }]);
      expect(flashcardApiMock.createFlashcards).toHaveBeenCalled();
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    });
  });

  describe('undo delete', () => {
    it('should dismiss undo', () => {
      facade.dismissUndo();
      expect(facade.lastDeletedSignal()).toBeNull();
    });
  });

  describe('saved banner', () => {
    it('should set and dismiss saved count', () => {
      facade.setSavedCount(5);
      expect(facade.savedCountSignal()).toBe(5);
      facade.dismissSavedBanner();
      expect(facade.savedCountSignal()).toBe(0);
    });
  });
});
