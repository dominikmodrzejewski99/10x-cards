import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { FlashcardListComponent } from './flashcard-list.component';
import { FlashcardsFacadeService } from '../../services/facades/flashcards-facade.service';
import { ShareService } from '../../services/api/share.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ToastService } from '../../shared/services/toast.service';
import { FlashcardDTO } from '../../../types';

describe('FlashcardListComponent', () => {
  let component: FlashcardListComponent;
  let fixture: ComponentFixture<FlashcardListComponent>;

  let facadeMock: jasmine.SpyObj<FlashcardsFacadeService>;
  let routerMock: jasmine.SpyObj<Router>;
  let confirmMock: jasmine.SpyObj<ConfirmService>;
  let toastMock: jasmine.SpyObj<ToastService>;
  let shareMock: jasmine.SpyObj<ShareService>;
  let routeParamsSubject: BehaviorSubject<Record<string, string>>;

  const mockFlashcard: FlashcardDTO = {
    id: 1, front: 'Hello', back: 'Cześć', front_image_url: null, back_audio_url: null,
    front_language: 'en', back_language: 'pl', source: 'manual',
    created_at: '', updated_at: '', user_id: 'u1', generation_id: null, set_id: 1, position: 0
  };

  beforeEach(async () => {
    routeParamsSubject = new BehaviorSubject<Record<string, string>>({ id: '1' });

    facadeMock = jasmine.createSpyObj<FlashcardsFacadeService>('FlashcardsFacadeService', [
      'initForSet', 'loadFlashcards', 'onSearch', 'onPageChange', 'onSort', 'onRowsChange',
      'resetFilters', 'openAddModal', 'openEditModal', 'closeFormModal', 'saveFlashcard',
      'deleteFlashcard', 'bulkDeleteFlashcards', 'undoDelete', 'dismissUndo',
      'openImportModal', 'closeImportModal', 'importFlashcards',
      'exportCsv', 'exportJson', 'printTest', 'onReorder',
      'setShareLink', 'setShareLoading', 'setSavedCount', 'dismissSavedBanner', 'destroy',
      'uploadImage', 'deleteImage', 'uploadAudio', 'deleteAudio',
      'requestTranslation', 'clearTranslationSuggestion'
    ], {
      flashcardsSignal: signal<FlashcardDTO[]>([mockFlashcard]),
      totalRecordsSignal: signal<number>(1),
      loadingSignal: signal<boolean>(false),
      errorSignal: signal<string | null>(null),
      rowsSignal: signal<number>(10),
      firstSignal: signal<number>(0),
      searchTermSignal: signal<string>(''),
      sortFieldSignal: signal<string>('position'),
      sortOrderSignal: signal<number>(1),
      setIdSignal: signal<number>(1),
      setNameSignal: signal<string>('English'),
      isFormModalVisibleSignal: signal<boolean>(false),
      isImportModalVisibleSignal: signal<boolean>(false),
      flashcardBeingEditedSignal: signal<FlashcardDTO | null>(null),
      lastDeletedSignal: signal<FlashcardDTO | null>(null),
      savedCountSignal: signal<number>(0),
      shareLinkSignal: signal<string | null>(null),
      shareLoadingSignal: signal<boolean>(false),
      needsAuthRedirectSignal: signal<boolean>(false),
      imagePreviewSignal: signal<string | null>(null),
      imageUploadingSignal: signal<boolean>(false),
      imageErrorSignal: signal<string | null>(null),
      audioPreviewSignal: signal<string | null>(null),
      audioUploadingSignal: signal<boolean>(false),
      audioErrorSignal: signal<string | null>(null),
      translationSuggestionSignal: signal<string | null>(null),
      translatingSignal: signal<boolean>(false)
    });

    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);
    confirmMock = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['confirm']);
    toastMock = jasmine.createSpyObj<ToastService>('ToastService', ['add']);
    shareMock = jasmine.createSpyObj<ShareService>('ShareService', ['createShareLink', 'buildShareUrl']);

    await TestBed.configureTestingModule({
      imports: [FlashcardListComponent, TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' } })],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: FlashcardsFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ConfirmService, useValue: confirmMock },
        { provide: ToastService, useValue: toastMock },
        { provide: ShareService, useValue: shareMock },
        { provide: ActivatedRoute, useValue: { params: routeParamsSubject.asObservable(), snapshot: { queryParams: {} } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FlashcardListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call facade.initForSet with setId from route', () => {
      fixture.detectChanges();
      expect(facadeMock.initForSet).toHaveBeenCalledWith(1);
    });

    it('should navigate to /sets when setId is invalid', () => {
      routeParamsSubject.next({ id: 'abc' });
      fixture.detectChanges();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/sets']);
    });
  });

  describe('handleDelete', () => {
    it('should confirm and delegate to facade', async () => {
      confirmMock.confirm.and.returnValue(Promise.resolve(true));
      fixture.detectChanges();

      await component.handleDelete(mockFlashcard);

      expect(confirmMock.confirm).toHaveBeenCalled();
      expect(facadeMock.deleteFlashcard).toHaveBeenCalledWith(mockFlashcard);
    });

    it('should not delete when not confirmed', async () => {
      confirmMock.confirm.and.returnValue(Promise.resolve(false));
      fixture.detectChanges();

      await component.handleDelete(mockFlashcard);

      expect(facadeMock.deleteFlashcard).not.toHaveBeenCalled();
    });
  });

  describe('handleBulkDelete', () => {
    it('should confirm and delegate to facade', async () => {
      confirmMock.confirm.and.returnValue(Promise.resolve(true));
      fixture.detectChanges();

      await component.handleBulkDelete([1, 2]);

      expect(facadeMock.bulkDeleteFlashcards).toHaveBeenCalledWith([1, 2]);
    });
  });

  describe('goBackToSets', () => {
    it('should navigate to /sets', () => {
      component.goBackToSets();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/sets']);
    });
  });

  describe('ngOnDestroy', () => {
    it('should call facade.destroy', () => {
      fixture.detectChanges();
      component.ngOnDestroy();
      expect(facadeMock.destroy).toHaveBeenCalled();
    });
  });
});
