import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Component } from '@angular/core';

import { TranslocoTestingModule } from '@jsverse/transloco';

import { FlashcardProposalListComponent } from './flashcard-proposal-list.component';
import { FlashcardProposalDTO } from '../../../../types';

const MOCK_PROPOSAL: FlashcardProposalDTO & { accepted?: boolean } = {
  front: 'Question 1',
  back: 'Answer 1',
  source: 'ai-full',
  accepted: true
};

const MOCK_PROPOSAL_2: FlashcardProposalDTO & { accepted?: boolean } = {
  front: 'Question 2',
  back: 'Answer 2',
  source: 'ai-full',
  accepted: false
};

@Component({
  template: `
    <app-flashcard-proposal-list
      [proposals]="proposals"
      (accept)="onAccept($event)"
      (reject)="onReject($event)"
      (edit)="onEdit($event)"
    />
  `,
  imports: [FlashcardProposalListComponent]
})
class TestHostComponent {
  public proposals: (FlashcardProposalDTO & { accepted?: boolean })[] = [MOCK_PROPOSAL, MOCK_PROPOSAL_2];
  public acceptedProposal: FlashcardProposalDTO | null = null;
  public rejectedProposal: FlashcardProposalDTO | null = null;
  public editedEvent: { original: FlashcardProposalDTO; edited: FlashcardProposalDTO } | null = null;

  public onAccept(proposal: FlashcardProposalDTO): void {
    this.acceptedProposal = proposal;
  }
  public onReject(proposal: FlashcardProposalDTO): void {
    this.rejectedProposal = proposal;
  }
  public onEdit(event: { original: FlashcardProposalDTO; edited: FlashcardProposalDTO }): void {
    this.editedEvent = event;
  }
}

describe('FlashcardProposalListComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let component: FlashcardProposalListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TestHostComponent,
        TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' } })
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    component = fixture.debugElement.children[0].componentInstance as FlashcardProposalListComponent;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('inputs', () => {
    it('should receive proposals input', () => {
      expect(component.proposalsSignal().length).toBe(2);
    });
  });

  describe('computed signals', () => {
    it('should compute acceptedCount from accepted proposals', () => {
      expect(component.acceptedCountSignal()).toBe(1);
    });
  });

  describe('onAccept', () => {
    it('should emit accept event with the proposal', () => {
      component.onAccept(MOCK_PROPOSAL);
      fixture.detectChanges();
      expect(host.acceptedProposal).toEqual(MOCK_PROPOSAL);
    });
  });

  describe('onReject', () => {
    it('should emit reject event with the proposal', () => {
      component.onReject(MOCK_PROPOSAL);
      fixture.detectChanges();
      expect(host.rejectedProposal).toEqual(MOCK_PROPOSAL);
    });
  });

  describe('edit dialog', () => {
    it('should open edit dialog and populate edited proposal', () => {
      component.openEditDialog(MOCK_PROPOSAL);

      expect(component.editDialogVisible).toBeTrue();
      expect(component.currentEditingProposal).toEqual({ ...MOCK_PROPOSAL });
      expect(component.editedProposal.front).toBe('Question 1');
      expect(component.editedProposal.back).toBe('Answer 1');
    });

    it('should save edit and emit edit event with source ai-edited', () => {
      component.openEditDialog(MOCK_PROPOSAL);
      component.editedProposal = { front: 'Edited Front', back: 'Edited Back' };

      component.saveEdit();
      fixture.detectChanges();

      expect(host.editedEvent).toBeTruthy();
      expect(host.editedEvent!.edited.front).toBe('Edited Front');
      expect(host.editedEvent!.edited.back).toBe('Edited Back');
      expect(host.editedEvent!.edited.source).toBe('ai-edited');
      expect(component.editDialogVisible).toBeFalse();
    });

    it('should not save edit when no proposal is being edited', () => {
      const editSpy: jasmine.Spy = spyOn(component.edit, 'emit');
      component.currentEditingProposal = null;

      component.saveEdit();

      expect(editSpy).not.toHaveBeenCalled();
    });

    it('should close edit dialog and reset state', () => {
      component.openEditDialog(MOCK_PROPOSAL);
      component.closeEditDialog();

      expect(component.editDialogVisible).toBeFalse();
      expect(component.currentEditingProposal).toBeNull();
      expect(component.editedProposal).toEqual({ front: '', back: '' });
    });
  });
});
