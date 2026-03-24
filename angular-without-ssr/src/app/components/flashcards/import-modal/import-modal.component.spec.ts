import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ImportModalComponent } from './import-modal.component';
import { TextParserService, ParseResult } from '../../../services/text-parser.service';
import { FlashcardProposalDTO } from '../../../../types';

describe('ImportModalComponent', () => {
  let component: ImportModalComponent;
  let fixture: ComponentFixture<ImportModalComponent>;
  let textParserSpy: jasmine.SpyObj<TextParserService>;

  const mockParseResult: ParseResult = {
    proposals: [
      { front: 'Q1', back: 'A1', source: 'manual' },
      { front: 'Q2', back: 'A2', source: 'manual' }
    ],
    errors: []
  };

  beforeEach(async () => {
    textParserSpy = jasmine.createSpyObj<TextParserService>('TextParserService', ['parseKeyValue']);
    textParserSpy.parseKeyValue.and.returnValue(mockParseResult);

    await TestBed.configureTestingModule({
      imports: [ImportModalComponent],
      providers: [
        { provide: TextParserService, useValue: textParserSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ImportModalComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('isVisible', true);
    fixture.componentRef.setInput('setId', 1);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial state', () => {
    it('should have empty rawText', () => {
      expect(component.rawText()).toBe('');
    });

    it('should have empty proposals', () => {
      expect(component.proposals()).toEqual([]);
    });

    it('should not be parsed', () => {
      expect(component.isParsed()).toBeFalse();
    });

    it('should have no editing id', () => {
      expect(component.editingId()).toBeNull();
    });

    it('should have acceptedCount 0', () => {
      expect(component.acceptedCount()).toBe(0);
    });

    it('should have canSave as false', () => {
      expect(component.canSave()).toBeFalse();
    });

    it('should have hasContent as false', () => {
      expect(component.hasContent()).toBeFalse();
    });
  });

  describe('onTabKey', () => {
    it('should insert tab character and update rawText', () => {
      const mockTextarea: Partial<HTMLTextAreaElement> = {
        selectionStart: 3,
        selectionEnd: 3,
        value: 'abc'
      };
      const mockEvent: Partial<Event> = {
        preventDefault: jasmine.createSpy('preventDefault'),
        target: mockTextarea as EventTarget
      };

      component.onTabKey(mockEvent as Event);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect((mockTextarea as HTMLTextAreaElement).value).toBe('abc\t');
      expect(component.rawText()).toBe('abc\t');
    });
  });

  describe('onParse', () => {
    it('should parse rawText and set proposals', () => {
      component.rawText.set('Q1\tA1\nQ2\tA2');
      component.onParse();

      expect(textParserSpy.parseKeyValue).toHaveBeenCalledWith('Q1\tA1\nQ2\tA2');
      expect(component.proposals().length).toBe(2);
      expect(component.isParsed()).toBeTrue();
    });

    it('should mark all proposals as accepted by default', () => {
      component.onParse();
      const allAccepted: boolean = component.proposals().every(
        (p: { accepted: boolean }) => p.accepted
      );
      expect(allAccepted).toBeTrue();
    });

    it('should set parse errors', () => {
      textParserSpy.parseKeyValue.and.returnValue({
        proposals: [],
        errors: [{ line: 1, content: 'bad', reason: 'No separator' }]
      });
      component.onParse();
      expect(component.parseErrors().length).toBe(1);
    });
  });

  describe('toggleAccept', () => {
    it('should toggle accepted state of a proposal', () => {
      component.onParse();
      const proposalId: string = component.proposals()[0]._id;

      component.toggleAccept(proposalId);
      expect(component.proposals()[0].accepted).toBeFalse();

      component.toggleAccept(proposalId);
      expect(component.proposals()[0].accepted).toBeTrue();
    });
  });

  describe('removeProposal', () => {
    it('should remove a proposal by id', () => {
      component.onParse();
      const proposalId: string = component.proposals()[0]._id;

      component.removeProposal(proposalId);
      expect(component.proposals().length).toBe(1);
    });
  });

  describe('editing', () => {
    it('should start editing by setting editingId', () => {
      component.onParse();
      const proposalId: string = component.proposals()[0]._id;

      component.startEdit(proposalId);
      expect(component.editingId()).toBe(proposalId);
    });

    it('should save edit with trimmed values', () => {
      component.onParse();
      const proposalId: string = component.proposals()[0]._id;

      component.saveEdit(proposalId, '  New Front  ', '  New Back  ');
      const updated: { front: string; back: string } = component.proposals().find(
        (p: { _id: string }) => p._id === proposalId
      )!;
      expect(updated.front).toBe('New Front');
      expect(updated.back).toBe('New Back');
      expect(component.editingId()).toBeNull();
    });

    it('should not save edit if front is empty', () => {
      component.onParse();
      const proposalId: string = component.proposals()[0]._id;
      const originalFront: string = component.proposals()[0].front;

      component.saveEdit(proposalId, '   ', 'Back');
      expect(component.proposals()[0].front).toBe(originalFront);
    });

    it('should not save edit if back is empty', () => {
      component.onParse();
      const proposalId: string = component.proposals()[0]._id;
      const originalBack: string = component.proposals()[0].back;

      component.saveEdit(proposalId, 'Front', '   ');
      expect(component.proposals()[0].back).toBe(originalBack);
    });

    it('should cancel editing', () => {
      component.startEdit('some-id');
      component.cancelEdit();
      expect(component.editingId()).toBeNull();
    });
  });

  describe('onSave', () => {
    it('should emit accepted proposals without internal fields', () => {
      const savedSpy: jasmine.Spy = spyOn(component.saved, 'emit');
      component.onParse();
      component.toggleAccept(component.proposals()[1]._id);

      component.onSave();

      const emitted: FlashcardProposalDTO[] =
        savedSpy.calls.mostRecent().args[0] as FlashcardProposalDTO[];
      expect(emitted.length).toBe(1);
      expect(emitted[0].front).toBe('Q1');
      expect((emitted[0] as Record<string, unknown>)['_id']).toBeUndefined();
      expect((emitted[0] as Record<string, unknown>)['accepted']).toBeUndefined();
    });
  });

  describe('onClose', () => {
    it('should reset all state and emit close', () => {
      const closeSpy: jasmine.Spy = spyOn(component.close, 'emit');
      component.rawText.set('text');
      component.onParse();
      component.startEdit('some-id');

      component.onClose();

      expect(component.rawText()).toBe('');
      expect(component.proposals()).toEqual([]);
      expect(component.parseErrors()).toEqual([]);
      expect(component.isParsed()).toBeFalse();
      expect(component.editingId()).toBeNull();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('resetToInput', () => {
    it('should clear proposals and errors but keep rawText', () => {
      component.rawText.set('some text');
      component.onParse();

      component.resetToInput();

      expect(component.proposals()).toEqual([]);
      expect(component.parseErrors()).toEqual([]);
      expect(component.isParsed()).toBeFalse();
      expect(component.rawText()).toBe('some text');
    });
  });

  describe('computed signals', () => {
    it('should calculate acceptedCount correctly', () => {
      component.onParse();
      expect(component.acceptedCount()).toBe(2);

      component.toggleAccept(component.proposals()[0]._id);
      expect(component.acceptedCount()).toBe(1);
    });

    it('should calculate totalCount correctly', () => {
      component.onParse();
      expect(component.totalCount()).toBe(2);
    });

    it('should calculate canSave as true when there are accepted proposals', () => {
      component.onParse();
      expect(component.canSave()).toBeTrue();
    });

    it('should calculate hasContent when rawText is non-empty', () => {
      component.rawText.set('some content');
      expect(component.hasContent()).toBeTrue();
    });
  });
});
