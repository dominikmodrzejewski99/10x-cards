import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { GenerateFacadeService, FlashcardProposalViewModel } from './generate-facade.service';
import { GenerationApiService } from '../api/generation-api.service';
import { FlashcardApiService } from '../api/flashcard-api.service';
import { FlashcardSetApiService } from '../api/flashcard-set-api.service';
import { LoggerService } from '../infrastructure/logger.service';
import { ToastService } from '../../shared/services/toast.service';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { FlashcardSetDTO, FlashcardProposalDTO, GenerationDTO } from '../../../types';

describe('GenerateFacadeService', () => {
  let facade: GenerateFacadeService;
  let generationApiMock: jasmine.SpyObj<GenerationApiService>;
  let flashcardApiMock: jasmine.SpyObj<FlashcardApiService>;
  let flashcardSetApiMock: jasmine.SpyObj<FlashcardSetApiService>;
  let loggerMock: jasmine.SpyObj<LoggerService>;
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

  const mockProposal: FlashcardProposalDTO = { front: 'Q1', back: 'A1' };
  const mockProposal2: FlashcardProposalDTO = { front: 'Q2', back: 'A2' };

  const mockGeneration: GenerationDTO = {
    id: 10, generated_count: 2, generation_duration: 500, model: 'test',
    source_text_hash: 'abc', source_text_length: 2000,
    accepted_edited_count: null, accepted_unedited_count: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    user_id: 'u1',
  };

  beforeEach(() => {
    generationApiMock = jasmine.createSpyObj<GenerationApiService>(
      'GenerationApiService', ['generateFlashcards', 'getDailyGenerationCount', 'getDailyLimit']
    );
    generationApiMock.getDailyLimit.and.returnValue(5);

    flashcardApiMock = jasmine.createSpyObj<FlashcardApiService>(
      'FlashcardApiService', ['createFlashcards']
    );

    flashcardSetApiMock = jasmine.createSpyObj<FlashcardSetApiService>(
      'FlashcardSetApiService', ['getSets', 'createSet']
    );

    loggerMock = jasmine.createSpyObj<LoggerService>('LoggerService', ['error']);
    toastMock = jasmine.createSpyObj<ToastService>('ToastService', ['add', 'clear']);

    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' },
        }),
      ],
      providers: [
        GenerateFacadeService,
        { provide: GenerationApiService, useValue: generationApiMock },
        { provide: FlashcardApiService, useValue: flashcardApiMock },
        { provide: FlashcardSetApiService, useValue: flashcardSetApiMock },
        { provide: LoggerService, useValue: loggerMock },
        { provide: ToastService, useValue: toastMock },
      ],
    });

    facade = TestBed.inject(GenerateFacadeService);
  });

  // --- loadSets ---

  describe('loadSets', () => {
    it('should load sets into signal on success', () => {
      flashcardSetApiMock.getSets.and.returnValue(of([mockSet, mockSet2]));

      facade.loadSets();

      expect(facade.setsSignal()).toEqual([mockSet, mockSet2]);
    });

    it('should log error on failure', () => {
      flashcardSetApiMock.getSets.and.returnValue(throwError(() => new Error('fail')));

      facade.loadSets();

      expect(loggerMock.error).toHaveBeenCalledWith('GenerateFacadeService.loadSets', jasmine.anything());
    });
  });

  // --- loadDailyCount ---

  describe('loadDailyCount', () => {
    it('should set daily count on success', () => {
      generationApiMock.getDailyGenerationCount.and.returnValue(of(3));

      facade.loadDailyCount();

      expect(facade.dailyCountSignal()).toBe(3);
    });

    it('should log error on failure', () => {
      generationApiMock.getDailyGenerationCount.and.returnValue(throwError(() => new Error('fail')));

      facade.loadDailyCount();

      expect(loggerMock.error).toHaveBeenCalledWith('GenerateFacadeService.loadDailyCount', jasmine.anything());
    });
  });

  // --- onTextChange / onValidityChange ---

  describe('onTextChange', () => {
    it('should update sourceText signal', () => {
      facade.onTextChange('new text');
      expect(facade.sourceTextSignal()).toBe('new text');
    });
  });

  describe('onValidityChange', () => {
    it('should update isSourceValid signal', () => {
      expect(facade.isSourceValidSignal()).toBeFalse();
      facade.onValidityChange(true);
      expect(facade.isSourceValidSignal()).toBeTrue();
    });
  });

  // --- setSelectedSetId / setNewSetName ---

  describe('setSelectedSetId', () => {
    it('should update selectedSetId signal', () => {
      facade.setSelectedSetId(42);
      expect(facade.selectedSetIdSignal()).toBe(42);
    });

    it('should accept null', () => {
      facade.setSelectedSetId(42);
      facade.setSelectedSetId(null);
      expect(facade.selectedSetIdSignal()).toBeNull();
    });
  });

  describe('setNewSetName', () => {
    it('should update newSetName signal', () => {
      facade.setNewSetName('My Set');
      expect(facade.newSetNameSignal()).toBe('My Set');
    });
  });

  // --- createNewSet ---

  describe('createNewSet', () => {
    it('should create set, prepend to list, select it, and clear name', () => {
      flashcardSetApiMock.getSets.and.returnValue(of([mockSet]));
      facade.loadSets();

      const created: FlashcardSetDTO = { ...mockSet2, id: 99, name: 'Brand New' };
      flashcardSetApiMock.createSet.and.returnValue(of(created));
      facade.setNewSetName('Brand New');

      facade.createNewSet();

      expect(facade.setsSignal().length).toBe(2);
      expect(facade.setsSignal()[0].name).toBe('Brand New');
      expect(facade.selectedSetIdSignal()).toBe(99);
      expect(facade.newSetNameSignal()).toBe('');
      expect(facade.isCreatingSetSignal()).toBeFalse();
    });

    it('should show error toast on failure', () => {
      flashcardSetApiMock.createSet.and.returnValue(throwError(() => new Error('fail')));
      facade.setNewSetName('Fail Set');

      facade.createNewSet();

      expect(facade.isCreatingSetSignal()).toBeFalse();
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
    });

    it('should do nothing when name is empty or whitespace', () => {
      facade.setNewSetName('   ');

      facade.createNewSet();

      expect(flashcardSetApiMock.createSet).not.toHaveBeenCalled();
    });
  });

  // --- generate ---

  describe('generate', () => {
    function enableGeneration(): void {
      facade.onValidityChange(true);
      generationApiMock.getDailyGenerationCount.and.returnValue(of(0));
      facade.loadDailyCount();
    }

    it('should set proposals, generationResult, and increment dailyCount on success', () => {
      enableGeneration();
      facade.onTextChange('a'.repeat(1000));
      generationApiMock.generateFlashcards.and.returnValue(of({
        generation: mockGeneration,
        flashcards: [mockProposal, mockProposal2],
      }));

      facade.generate();

      expect(facade.proposalsSignal().length).toBe(2);
      expect(facade.proposalsSignal()[0].front).toBe('Q1');
      expect(facade.proposalsSignal()[0]._id).toBeTruthy();
      expect(facade.generationResultSignal()).toEqual(mockGeneration);
      expect(facade.isGeneratingSignal()).toBeFalse();
      expect(facade.dailyCountSignal()).toBe(1);
    });

    it('should set errorMessage and show toast on error', () => {
      enableGeneration();
      generationApiMock.generateFlashcards.and.returnValue(throwError(() => ({ status: 500 })));

      facade.generate();

      expect(facade.errorMessageSignal()).toBeTruthy();
      expect(facade.isGeneratingSignal()).toBeFalse();
      expect(facade.proposalsSignal()).toEqual([]);
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
    });

    it('should return early if canGenerateSignal is false', () => {
      // isSourceValid defaults to false, so canGenerate is false
      facade.generate();

      expect(generationApiMock.generateFlashcards).not.toHaveBeenCalled();
      expect(facade.isGeneratingSignal()).toBeFalse();
    });

    it('should return early if daily limit is reached', () => {
      facade.onValidityChange(true);
      generationApiMock.getDailyGenerationCount.and.returnValue(of(5));
      facade.loadDailyCount();

      facade.generate();

      expect(generationApiMock.generateFlashcards).not.toHaveBeenCalled();
    });
  });

  // --- saveAllProposals ---

  describe('saveAllProposals', () => {
    function setupForSave(): void {
      facade.setSelectedSetId(1);
      // Manually set proposals via generate flow
      generationApiMock.getDailyGenerationCount.and.returnValue(of(0));
      facade.loadDailyCount();
      facade.onValidityChange(true);
      generationApiMock.generateFlashcards.and.returnValue(of({
        generation: mockGeneration,
        flashcards: [mockProposal, mockProposal2],
      }));
      facade.generate();
      // Accept all
      facade.toggleAcceptAll();
    }

    it('should save accepted proposals, set navigationTarget, and clear proposals on success', () => {
      setupForSave();
      const savedCards: FlashcardProposalDTO[] = [mockProposal, mockProposal2];
      flashcardApiMock.createFlashcards.and.returnValue(of(savedCards as any));

      facade.saveAllProposals();

      expect(facade.proposalsSignal()).toEqual([]);
      expect(facade.generationResultSignal()).toBeNull();
      expect(facade.isSavingSignal()).toBeFalse();
      expect(facade.navigationTargetSignal()).toEqual({ setId: 1, savedCount: 2 });
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    });

    it('should handle save error with toast', () => {
      setupForSave();
      flashcardApiMock.createFlashcards.and.returnValue(throwError(() => ({ status: 500 })));

      facade.saveAllProposals();

      expect(facade.isSavingSignal()).toBeFalse();
      expect(facade.errorMessageSignal()).toBeTruthy();
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
    });

    it('should return early if canSave is false (no accepted proposals)', () => {
      facade.setSelectedSetId(1);
      // No proposals => canSave false
      facade.saveAllProposals();

      expect(flashcardApiMock.createFlashcards).not.toHaveBeenCalled();
    });

    it('should return early if no set is selected', () => {
      // Generate proposals but don't select a set
      generationApiMock.getDailyGenerationCount.and.returnValue(of(0));
      facade.loadDailyCount();
      facade.onValidityChange(true);
      generationApiMock.generateFlashcards.and.returnValue(of({
        generation: mockGeneration,
        flashcards: [mockProposal],
      }));
      facade.generate();
      facade.toggleAcceptAll();
      // selectedSetId is null

      facade.saveAllProposals();

      expect(flashcardApiMock.createFlashcards).not.toHaveBeenCalled();
    });
  });

  // --- acceptProposal ---

  describe('acceptProposal', () => {
    it('should toggle accepted status of a proposal', () => {
      generationApiMock.getDailyGenerationCount.and.returnValue(of(0));
      facade.loadDailyCount();
      facade.onValidityChange(true);
      generationApiMock.generateFlashcards.and.returnValue(of({
        generation: mockGeneration,
        flashcards: [mockProposal],
      }));
      facade.generate();

      const proposal = facade.proposalsSignal()[0];
      expect(proposal.accepted).toBeFalsy();

      facade.acceptProposal(proposal);
      expect(facade.proposalsSignal()[0].accepted).toBeTrue();

      facade.acceptProposal(facade.proposalsSignal()[0]);
      expect(facade.proposalsSignal()[0].accepted).toBeFalse();
    });
  });

  // --- rejectProposal ---

  describe('rejectProposal', () => {
    it('should remove proposal from list and show toast', () => {
      generationApiMock.getDailyGenerationCount.and.returnValue(of(0));
      facade.loadDailyCount();
      facade.onValidityChange(true);
      generationApiMock.generateFlashcards.and.returnValue(of({
        generation: mockGeneration,
        flashcards: [mockProposal, mockProposal2],
      }));
      facade.generate();

      const proposal = facade.proposalsSignal()[0];
      facade.rejectProposal(proposal);

      expect(facade.proposalsSignal().length).toBe(1);
      expect(facade.proposalsSignal()[0].front).toBe('Q2');
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'warn' }));
    });
  });

  // --- toggleAcceptAll ---

  describe('toggleAcceptAll', () => {
    beforeEach(() => {
      generationApiMock.getDailyGenerationCount.and.returnValue(of(0));
      facade.loadDailyCount();
      facade.onValidityChange(true);
      generationApiMock.generateFlashcards.and.returnValue(of({
        generation: mockGeneration,
        flashcards: [mockProposal, mockProposal2],
      }));
      facade.generate();
    });

    it('should accept all proposals when not all are accepted', () => {
      facade.toggleAcceptAll();

      expect(facade.proposalsSignal().every(p => p.accepted)).toBeTrue();
      expect(facade.acceptedCountSignal()).toBe(2);
    });

    it('should deselect all proposals when all are already accepted', () => {
      facade.toggleAcceptAll(); // accept all
      facade.toggleAcceptAll(); // deselect all

      expect(facade.proposalsSignal().every(p => !p.accepted)).toBeTrue();
      expect(facade.acceptedCountSignal()).toBe(0);
    });
  });

  // --- editProposal ---

  describe('editProposal', () => {
    it('should update proposal in list and show success toast', () => {
      generationApiMock.getDailyGenerationCount.and.returnValue(of(0));
      facade.loadDailyCount();
      facade.onValidityChange(true);
      generationApiMock.generateFlashcards.and.returnValue(of({
        generation: mockGeneration,
        flashcards: [mockProposal],
      }));
      facade.generate();

      const edited: FlashcardProposalDTO = { front: 'Q1-edited', back: 'A1-edited' };
      facade.editProposal({ original: mockProposal, edited });

      expect(facade.proposalsSignal()[0].front).toBe('Q1-edited');
      expect(facade.proposalsSignal()[0].back).toBe('A1-edited');
      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    });

    it('should preserve accepted and _id when editing', () => {
      generationApiMock.getDailyGenerationCount.and.returnValue(of(0));
      facade.loadDailyCount();
      facade.onValidityChange(true);
      generationApiMock.generateFlashcards.and.returnValue(of({
        generation: mockGeneration,
        flashcards: [mockProposal],
      }));
      facade.generate();

      facade.acceptProposal(facade.proposalsSignal()[0]);
      const originalId = facade.proposalsSignal()[0]._id;

      const edited: FlashcardProposalDTO = { front: 'Q1-v2', back: 'A1-v2' };
      facade.editProposal({ original: mockProposal, edited });

      expect(facade.proposalsSignal()[0].accepted).toBeTrue();
      expect(facade.proposalsSignal()[0]._id).toBe(originalId);
    });
  });

  // --- dismissError ---

  describe('dismissError', () => {
    it('should clear errorMessage', () => {
      // Trigger an error first
      facade.onValidityChange(true);
      generationApiMock.getDailyGenerationCount.and.returnValue(of(0));
      facade.loadDailyCount();
      generationApiMock.generateFlashcards.and.returnValue(throwError(() => ({ status: 500 })));
      facade.generate();

      expect(facade.errorMessageSignal()).toBeTruthy();

      facade.dismissError();

      expect(facade.errorMessageSignal()).toBeNull();
    });
  });

  // --- handleApiError (tested indirectly) ---

  describe('handleApiError via generate', () => {
    beforeEach(() => {
      facade.onValidityChange(true);
      generationApiMock.getDailyGenerationCount.and.returnValue(of(0));
      facade.loadDailyCount();
    });

    it('should set needsAuthRedirect after timeout for 401 error', fakeAsync(() => {
      generationApiMock.generateFlashcards.and.returnValue(throwError(() => ({ status: 401 })));

      facade.generate();

      expect(facade.needsAuthRedirectSignal()).toBeFalse();

      tick(2000);

      expect(facade.needsAuthRedirectSignal()).toBeTrue();
    }));

    it('should set needsAuthRedirect for session-expired message', fakeAsync(() => {
      generationApiMock.generateFlashcards.and.returnValue(
        throwError(() => ({ status: 403, message: 'Sesja wygasła, zaloguj ponownie' }))
      );

      facade.generate();

      tick(2000);

      expect(facade.needsAuthRedirectSignal()).toBeTrue();
    }));

    it('should show error toast with life 5000 on API error', () => {
      generationApiMock.generateFlashcards.and.returnValue(throwError(() => ({ status: 400 })));

      facade.generate();

      expect(toastMock.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', life: 5000 }));
    });
  });

  // --- Computed signals ---

  describe('computed signals', () => {
    it('should compute remainingGenerations correctly', () => {
      generationApiMock.getDailyGenerationCount.and.returnValue(of(3));
      facade.loadDailyCount();

      expect(facade.remainingGenerationsSignal()).toBe(2); // dailyLimit(5) - 3
    });

    it('should compute limitReached when dailyCount >= dailyLimit', () => {
      generationApiMock.getDailyGenerationCount.and.returnValue(of(5));
      facade.loadDailyCount();

      expect(facade.limitReachedSignal()).toBeTrue();
    });

    it('should compute canGenerate based on validity and limits', () => {
      generationApiMock.getDailyGenerationCount.and.returnValue(of(0));
      facade.loadDailyCount();

      expect(facade.canGenerateSignal()).toBeFalse(); // not valid yet

      facade.onValidityChange(true);
      expect(facade.canGenerateSignal()).toBeTrue();
    });

    it('should compute canSave when accepted proposals exist and set selected', () => {
      generationApiMock.getDailyGenerationCount.and.returnValue(of(0));
      facade.loadDailyCount();
      facade.onValidityChange(true);
      generationApiMock.generateFlashcards.and.returnValue(of({
        generation: mockGeneration,
        flashcards: [mockProposal],
      }));
      facade.generate();
      facade.setSelectedSetId(1);
      facade.toggleAcceptAll();

      expect(facade.canSaveSignal()).toBeTrue();
    });
  });

  // --- clearNavigationTarget ---

  describe('clearNavigationTarget', () => {
    it('should clear navigationTarget signal', () => {
      // Set up a navigation target via save flow
      facade.setSelectedSetId(1);
      generationApiMock.getDailyGenerationCount.and.returnValue(of(0));
      facade.loadDailyCount();
      facade.onValidityChange(true);
      generationApiMock.generateFlashcards.and.returnValue(of({
        generation: mockGeneration,
        flashcards: [mockProposal],
      }));
      facade.generate();
      facade.toggleAcceptAll();
      flashcardApiMock.createFlashcards.and.returnValue(of([mockProposal] as any));
      facade.saveAllProposals();

      expect(facade.navigationTargetSignal()).toBeTruthy();

      facade.clearNavigationTarget();

      expect(facade.navigationTargetSignal()).toBeNull();
    });
  });
});
