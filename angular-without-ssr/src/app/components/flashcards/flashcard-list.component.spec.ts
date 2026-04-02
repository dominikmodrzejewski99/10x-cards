import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, of, throwError, Subject } from 'rxjs';
import { MessageService, ConfirmationService, Confirmation } from 'primeng/api';

import { FlashcardListComponent } from './flashcard-list.component';
import { FlashcardApiService } from '../../services/flashcard-api.service';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { ShareService } from '../../services/share.service';
import { FlashcardDTO, FlashcardSetDTO } from '../../../types';
import { FlashcardFormData } from './flashcard-form/flashcard-form.component';
import { TranslocoTestingModule } from '@jsverse/transloco';

describe('FlashcardListComponent', () => {
  let component: FlashcardListComponent;
  let fixture: ComponentFixture<FlashcardListComponent>;

  let flashcardApiMock: jasmine.SpyObj<FlashcardApiService>;
  let flashcardSetApiMock: jasmine.SpyObj<FlashcardSetApiService>;
  let shareServiceMock: jasmine.SpyObj<ShareService>;
  let messageServiceMock: jasmine.SpyObj<MessageService>;
  let confirmationServiceMock: jasmine.SpyObj<ConfirmationService>;
  let routerMock: jasmine.SpyObj<Router>;
  let routeParamsSubject: BehaviorSubject<Record<string, string>>;

  const mockFlashcard: FlashcardDTO = {
    id: 1,
    front: 'Hello',
    back: 'Cześć',
    front_image_url: null,
    back_audio_url: null,
    front_language: 'en',
    back_language: 'pl',
    source: 'manual',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1',
    generation_id: null,
    set_id: 5,
    position: 0
  };

  const mockFlashcard2: FlashcardDTO = {
    ...mockFlashcard,
    id: 2,
    front: 'World',
    back: 'Świat'
  };

  const mockSet: FlashcardSetDTO = {
    id: 5,
    user_id: 'user-1',
    name: 'English Basics',
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  };

  const mockFlashcardsResponse: { flashcards: FlashcardDTO[]; totalRecords: number } = {
    flashcards: [mockFlashcard, mockFlashcard2],
    totalRecords: 2
  };

  beforeEach(async () => {
    routeParamsSubject = new BehaviorSubject<Record<string, string>>({ id: '5' });

    flashcardApiMock = jasmine.createSpyObj<FlashcardApiService>(
      'FlashcardApiService',
      ['getFlashcards', 'createFlashcard', 'updateFlashcard', 'deleteFlashcard', 'createFlashcards']
    );
    flashcardSetApiMock = jasmine.createSpyObj<FlashcardSetApiService>(
      'FlashcardSetApiService',
      ['getSet']
    );
    shareServiceMock = jasmine.createSpyObj<ShareService>(
      'ShareService',
      ['createShareLink', 'buildShareUrl']
    );
    messageServiceMock = jasmine.createSpyObj<MessageService>('MessageService', ['add', 'clear']);
    // Toast component needs messageObserver and clearObserver
    (messageServiceMock as unknown as Record<string, unknown>)['messageObserver'] = new Subject<unknown>();
    (messageServiceMock as unknown as Record<string, unknown>)['clearObserver'] = new Subject<unknown>();

    confirmationServiceMock = jasmine.createSpyObj<ConfirmationService>('ConfirmationService', ['confirm']);
    // ConfirmDialog component needs requireConfirmation$
    (confirmationServiceMock as unknown as Record<string, unknown>)['requireConfirmation$'] = new Subject<Confirmation>();
    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);

    flashcardApiMock.getFlashcards.and.returnValue(of(mockFlashcardsResponse));
    flashcardSetApiMock.getSet.and.returnValue(of(mockSet));

    await TestBed.configureTestingModule({
      imports: [FlashcardListComponent, TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' } })],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: FlashcardApiService, useValue: flashcardApiMock },
        { provide: FlashcardSetApiService, useValue: flashcardSetApiMock },
        { provide: ShareService, useValue: shareServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            params: routeParamsSubject.asObservable(),
            snapshot: { queryParams: {}, paramMap: { get: () => '5' } }
          }
        }
      ]
    })
    .overrideComponent(FlashcardListComponent, {
      remove: { providers: [MessageService, ConfirmationService] },
      add: {
        providers: [
          { provide: MessageService, useValue: messageServiceMock },
          { provide: ConfirmationService, useValue: confirmationServiceMock }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlashcardListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load flashcards and set name on init', () => {
      fixture.detectChanges();

      expect(flashcardSetApiMock.getSet).toHaveBeenCalledWith(5);
      expect(flashcardApiMock.getFlashcards).toHaveBeenCalled();
      expect(component.state().flashcards.length).toBe(2);
      expect(component.state().setName).toBe('English Basics');
      expect(component.state().loading).toBeFalse();
    });

    it('should redirect to /sets when setId is invalid', () => {
      routeParamsSubject.next({ id: '0' });
      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/sets']);
    });

    it('should redirect to /sets when set not found', () => {
      flashcardSetApiMock.getSet.and.returnValue(throwError(() => new Error('Not found')));
      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/sets']);
    });
  });

  describe('onSearch', () => {
    it('should update searchTerm, reset pagination, and reload flashcards', () => {
      fixture.detectChanges();
      flashcardApiMock.getFlashcards.calls.reset();

      component.onSearch('test query');

      expect(component.state().searchTerm).toBe('test query');
      expect(component.state().first).toBe(0);
      expect(flashcardApiMock.getFlashcards).toHaveBeenCalled();
    });
  });

  describe('pagination', () => {
    it('should update state and reload on page change', () => {
      fixture.detectChanges();
      flashcardApiMock.getFlashcards.calls.reset();

      component.onPageChange({ first: 10, rows: 10 });

      expect(component.state().first).toBe(10);
      expect(component.state().rows).toBe(10);
      expect(flashcardApiMock.getFlashcards).toHaveBeenCalled();
    });
  });

  describe('handleDelete', () => {
    it('should call confirmationService and delete flashcard on accept', () => {
      fixture.detectChanges();
      flashcardApiMock.deleteFlashcard.and.returnValue(of(undefined));
      flashcardApiMock.getFlashcards.calls.reset();

      confirmationServiceMock.confirm.and.callFake((confirmation: Confirmation) => {
        if (confirmation.accept) {
          confirmation.accept();
        }
        return confirmationServiceMock;
      });

      component.handleDelete(mockFlashcard);

      expect(confirmationServiceMock.confirm).toHaveBeenCalled();
      expect(flashcardApiMock.deleteFlashcard).toHaveBeenCalledWith(1);
      expect(component.lastDeletedSignal()).toEqual(mockFlashcard);
    });

    it('should show error message on delete failure', () => {
      fixture.detectChanges();
      flashcardApiMock.deleteFlashcard.and.returnValue(
        throwError(() => ({ status: 500, message: 'Server error' }))
      );

      confirmationServiceMock.confirm.and.callFake((confirmation: Confirmation) => {
        if (confirmation.accept) {
          confirmation.accept();
        }
        return confirmationServiceMock;
      });

      component.handleDelete(mockFlashcard);

      expect(messageServiceMock.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'error' })
      );
      expect(component.state().loading).toBeFalse();
    });
  });

  describe('handleBulkDelete', () => {
    it('should handle partial failure during bulk delete', () => {
      fixture.detectChanges();
      flashcardApiMock.deleteFlashcard.and.callFake((id: number) => {
        if (id === 1) {
          return of(undefined);
        }
        return throwError(() => new Error('Delete failed'));
      });
      flashcardApiMock.getFlashcards.calls.reset();

      confirmationServiceMock.confirm.and.callFake((confirmation: Confirmation) => {
        if (confirmation.accept) {
          confirmation.accept();
        }
        return confirmationServiceMock;
      });

      component.handleBulkDelete([1, 2]);

      expect(messageServiceMock.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'warn', summary: 'Częściowy sukces' })
      );
      expect(flashcardApiMock.getFlashcards).toHaveBeenCalled();
    });

    it('should show success when all bulk deletes succeed', () => {
      fixture.detectChanges();
      flashcardApiMock.deleteFlashcard.and.returnValue(of(undefined));
      flashcardApiMock.getFlashcards.calls.reset();

      confirmationServiceMock.confirm.and.callFake((confirmation: Confirmation) => {
        if (confirmation.accept) {
          confirmation.accept();
        }
        return confirmationServiceMock;
      });

      component.handleBulkDelete([1, 2]);

      expect(messageServiceMock.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'success' })
      );
    });

    it('should show error when all bulk deletes fail', () => {
      fixture.detectChanges();
      flashcardApiMock.deleteFlashcard.and.returnValue(
        throwError(() => new Error('Delete failed'))
      );

      confirmationServiceMock.confirm.and.callFake((confirmation: Confirmation) => {
        if (confirmation.accept) {
          confirmation.accept();
        }
        return confirmationServiceMock;
      });

      component.handleBulkDelete([1, 2]);

      expect(messageServiceMock.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'error' })
      );
    });
  });

  describe('openAddModal', () => {
    it('should set isFormModalVisible to true and flashcardBeingEdited to null', () => {
      fixture.detectChanges();

      component.openAddModal();

      expect(component.state().isFormModalVisible).toBeTrue();
      expect(component.state().flashcardBeingEdited).toBeNull();
    });
  });

  describe('openEditModal', () => {
    it('should set isFormModalVisible to true and flashcardBeingEdited to the given flashcard', () => {
      fixture.detectChanges();

      component.openEditModal(mockFlashcard);

      expect(component.state().isFormModalVisible).toBeTrue();
      expect(component.state().flashcardBeingEdited).toEqual(mockFlashcard);
    });
  });

  describe('onSave', () => {
    it('should create a new flashcard when no id is provided', () => {
      fixture.detectChanges();
      const newFlashcard: FlashcardDTO = { ...mockFlashcard, id: 3 };
      flashcardApiMock.createFlashcard.and.returnValue(of(newFlashcard));
      flashcardApiMock.getFlashcards.calls.reset();

      const formData: FlashcardFormData = {
        front: 'New',
        back: 'Nowy'
      };

      component.onSave(formData);

      expect(flashcardApiMock.createFlashcard).toHaveBeenCalled();
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'success' })
      );
    });

    it('should update an existing flashcard when id is provided', () => {
      fixture.detectChanges();
      const updated: FlashcardDTO = { ...mockFlashcard, front: 'Updated' };
      flashcardApiMock.updateFlashcard.and.returnValue(of(updated));

      const formData: FlashcardFormData = {
        id: 1,
        front: 'Updated',
        back: 'Cześć'
      };

      component.onSave(formData);

      expect(flashcardApiMock.updateFlashcard).toHaveBeenCalledWith(1, jasmine.objectContaining({ front: 'Updated' }));
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'success' })
      );
    });
  });

  describe('loadFlashcards error handling', () => {
    it('should show auth error toast when error contains "nie jest zalogowany"', () => {
      flashcardApiMock.getFlashcards.and.returnValue(
        throwError(() => ({ message: 'Użytkownik nie jest zalogowany' }))
      );

      fixture.detectChanges();

      expect(component.state().loading).toBeFalse();
      expect(component.state().error).toContain('zalogowany');
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'error', summary: 'Błąd autoryzacji' })
      );
    });
  });
});
