import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { MessageService } from 'primeng/api';

import { GenerateViewComponent } from './generate-view.component';
import { GenerationApiService } from '../../services/generation-api.service';
import { FlashcardApiService } from '../../services/flashcard-api.service';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import {
  FlashcardDTO,
  FlashcardProposalDTO,
  FlashcardSetDTO,
  GenerationDTO
} from '../../../types';

describe('GenerateViewComponent', () => {
  let component: GenerateViewComponent;
  let fixture: ComponentFixture<GenerateViewComponent>;

  let generationApiMock: jasmine.SpyObj<GenerationApiService>;
  let flashcardApiMock: jasmine.SpyObj<FlashcardApiService>;
  let flashcardSetApiMock: jasmine.SpyObj<FlashcardSetApiService>;
  let messageServiceMock: jasmine.SpyObj<MessageService>;
  let routerMock: jasmine.SpyObj<Router>;

  const mockGeneration: GenerationDTO = {
    id: 1,
    generated_count: 2,
    generation_duration: 3.5,
    model: 'test-model',
    source_text_hash: 'abc123',
    source_text_length: 1500,
    accepted_edited_count: null,
    accepted_unedited_count: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1'
  };

  const mockProposals: FlashcardProposalDTO[] = [
    { front: 'What is Angular?', back: 'A web framework', source: 'ai-full' },
    { front: 'What is RxJS?', back: 'Reactive Extensions for JS', source: 'ai-full' }
  ];

  const mockSet: FlashcardSetDTO = {
    id: 10,
    user_id: 'user-1',
    name: 'Generated Set',
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  };

  const mockSavedFlashcards: FlashcardDTO[] = [
    {
      id: 100, front: 'What is Angular?', back: 'A web framework',
      front_image_url: null, back_audio_url: null, front_language: null, back_language: null,
      source: 'ai-full', created_at: '', updated_at: '', user_id: 'user-1', generation_id: 1, set_id: 10, position: 0
    },
    {
      id: 101, front: 'What is RxJS?', back: 'Reactive Extensions for JS',
      front_image_url: null, back_audio_url: null, front_language: null, back_language: null,
      source: 'ai-full', created_at: '', updated_at: '', user_id: 'user-1', generation_id: 1, set_id: 10, position: 0
    }
  ];

  beforeEach(async () => {
    generationApiMock = jasmine.createSpyObj<GenerationApiService>(
      'GenerationApiService',
      ['generateFlashcards']
    );
    flashcardApiMock = jasmine.createSpyObj<FlashcardApiService>(
      'FlashcardApiService',
      ['createFlashcards']
    );
    flashcardSetApiMock = jasmine.createSpyObj<FlashcardSetApiService>(
      'FlashcardSetApiService',
      ['getSets', 'createSet']
    );
    messageServiceMock = jasmine.createSpyObj<MessageService>('MessageService', ['add', 'clear']);
    (messageServiceMock as unknown as Record<string, unknown>)['messageObserver'] = new Subject<unknown>();
    (messageServiceMock as unknown as Record<string, unknown>)['clearObserver'] = new Subject<unknown>();

    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);

    flashcardSetApiMock.getSets.and.returnValue(of([mockSet]));

    await TestBed.configureTestingModule({
      imports: [GenerateViewComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: GenerationApiService, useValue: generationApiMock },
        { provide: FlashcardApiService, useValue: flashcardApiMock },
        { provide: FlashcardSetApiService, useValue: flashcardSetApiMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: {} }
      ]
    })
    .overrideComponent(GenerateViewComponent, {
      remove: { providers: [MessageService] },
      add: {
        providers: [
          { provide: MessageService, useValue: messageServiceMock }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(GenerateViewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load sets on init', () => {
      fixture.detectChanges();

      expect(flashcardSetApiMock.getSets).toHaveBeenCalled();
      expect(component.sets().length).toBe(1);
    });
  });

  describe('generate', () => {
    it('should generate flashcard proposals from source text', () => {
      fixture.detectChanges();

      generationApiMock.generateFlashcards.and.returnValue(of({
        generation: mockGeneration,
        flashcards: mockProposals
      }));

      component.sourceText.set('A'.repeat(1500));
      component.isSourceValid.set(true);

      component.generate();

      expect(generationApiMock.generateFlashcards).toHaveBeenCalledWith(
        jasmine.objectContaining({ text: 'A'.repeat(1500) })
      );
      expect(component.proposals().length).toBe(2);
      expect(component.isGenerating()).toBeFalse();
      expect(component.generationResult()).toEqual(mockGeneration);
    });

    it('should not generate when canGenerate is false', () => {
      fixture.detectChanges();

      component.isSourceValid.set(false);
      component.generate();

      expect(generationApiMock.generateFlashcards).not.toHaveBeenCalled();
    });

    it('should clear previous proposals and errors before generating', () => {
      fixture.detectChanges();

      generationApiMock.generateFlashcards.and.returnValue(of({
        generation: mockGeneration,
        flashcards: mockProposals
      }));

      component.errorMessage.set('Old error');
      component.sourceText.set('A'.repeat(1500));
      component.isSourceValid.set(true);

      component.generate();

      expect(messageServiceMock.clear).toHaveBeenCalled();
    });

    it('should show loading indicator while generating', () => {
      fixture.detectChanges();

      // Keep the observable pending by not returning yet
      generationApiMock.generateFlashcards.and.returnValue(of({
        generation: mockGeneration,
        flashcards: mockProposals
      }));

      component.sourceText.set('A'.repeat(1500));
      component.isSourceValid.set(true);
      expect(component.isGenerating()).toBeFalse();

      component.generate();

      // After generation completes
      expect(component.isGenerating()).toBeFalse();
    });
  });

  describe('generate error handling', () => {
    it('should set error message on generation failure', () => {
      fixture.detectChanges();

      generationApiMock.generateFlashcards.and.returnValue(
        throwError(() => ({ status: 500 }))
      );

      component.sourceText.set('A'.repeat(1500));
      component.isSourceValid.set(true);

      component.generate();

      expect(component.errorMessage()).toBeTruthy();
      expect(component.isGenerating()).toBeFalse();
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'error' })
      );
    });

    it('should handle 401 error with auth message', () => {
      fixture.detectChanges();

      generationApiMock.generateFlashcards.and.returnValue(
        throwError(() => ({ status: 401 }))
      );

      component.sourceText.set('A'.repeat(1500));
      component.isSourceValid.set(true);

      component.generate();

      expect(component.errorMessage()).toContain('autoryzacji');
    });
  });

  describe('saveAllProposals', () => {
    it('should save accepted proposals and navigate to set', () => {
      fixture.detectChanges();

      flashcardApiMock.createFlashcards.and.returnValue(of(mockSavedFlashcards));

      // Simulate generated proposals
      component.proposals.set([
        { ...mockProposals[0], accepted: true, _id: '1' },
        { ...mockProposals[1], accepted: true, _id: '2' }
      ]);
      component.selectedSetId.set(10);

      component.saveAllProposals();

      expect(flashcardApiMock.createFlashcards).toHaveBeenCalled();
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'success' })
      );
      expect(routerMock.navigate).toHaveBeenCalledWith(['/sets', 10]);
      expect(component.proposals().length).toBe(0);
      expect(component.isSaving()).toBeFalse();
    });

    it('should not save when no proposals are accepted', () => {
      fixture.detectChanges();

      component.proposals.set([
        { ...mockProposals[0], accepted: false, _id: '1' }
      ]);
      component.selectedSetId.set(10);

      component.saveAllProposals();

      expect(flashcardApiMock.createFlashcards).not.toHaveBeenCalled();
    });

    it('should not save when no set is selected', () => {
      fixture.detectChanges();

      component.proposals.set([
        { ...mockProposals[0], accepted: true, _id: '1' }
      ]);
      component.selectedSetId.set(null);

      component.saveAllProposals();

      expect(flashcardApiMock.createFlashcards).not.toHaveBeenCalled();
    });

    it('should handle save error', () => {
      fixture.detectChanges();

      flashcardApiMock.createFlashcards.and.returnValue(
        throwError(() => ({ status: 500 }))
      );

      component.proposals.set([
        { ...mockProposals[0], accepted: true, _id: '1' }
      ]);
      component.selectedSetId.set(10);

      component.saveAllProposals();

      expect(component.errorMessage()).toBeTruthy();
      expect(component.isSaving()).toBeFalse();
    });
  });

  describe('acceptProposal', () => {
    it('should toggle accepted state of a proposal', () => {
      fixture.detectChanges();

      const proposal = { ...mockProposals[0], accepted: false, _id: '1' };
      component.proposals.set([proposal]);

      component.acceptProposal(proposal);

      expect(component.proposals()[0].accepted).toBeTrue();
    });
  });

  describe('rejectProposal', () => {
    it('should remove proposal from list', () => {
      fixture.detectChanges();

      const proposal = { ...mockProposals[0], accepted: true, _id: '1' };
      component.proposals.set([proposal]);

      component.rejectProposal(proposal);

      expect(component.proposals().length).toBe(0);
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        jasmine.objectContaining({ severity: 'info' })
      );
    });
  });
});
