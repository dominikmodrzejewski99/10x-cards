import { Component, computed, input, output, InputSignal, OutputEmitterRef, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { FlashcardProposalDTO } from '../../../../types';

@Component({
  selector: 'app-flashcard-proposal-list',
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    DialogModule,
    FormsModule,
    InputTextModule,
    TextareaModule,
    TooltipModule
  ],
  templateUrl: './flashcard-proposal-list.component.html',
  styleUrls: ['./flashcard-proposal-list.component.css']
})
export class FlashcardProposalListComponent {
  public proposalsSignal: InputSignal<(FlashcardProposalDTO & { accepted?: boolean })[]> =
    input<(FlashcardProposalDTO & { accepted?: boolean })[]>([], { alias: 'proposals' });

  public accept: OutputEmitterRef<FlashcardProposalDTO> = output<FlashcardProposalDTO>();
  public reject: OutputEmitterRef<FlashcardProposalDTO> = output<FlashcardProposalDTO>();
  public edit: OutputEmitterRef<{original: FlashcardProposalDTO, edited: FlashcardProposalDTO}> =
    output<{original: FlashcardProposalDTO, edited: FlashcardProposalDTO}>();

  editDialogVisible = false;
  currentEditingProposal: FlashcardProposalDTO | null = null;
  editedProposal: {front: string, back: string} = {front: '', back: ''};

  public acceptedCountSignal: Signal<number> = computed<number>(() =>
    this.proposalsSignal().filter(p => p.accepted).length
  );

  onAccept(proposal: FlashcardProposalDTO): void {
    this.accept.emit(proposal);
  }

  onReject(proposal: FlashcardProposalDTO): void {
    this.reject.emit(proposal);
  }

  openEditDialog(proposal: FlashcardProposalDTO): void {
    this.currentEditingProposal = {...proposal};
    this.editedProposal = {
      front: proposal.front,
      back: proposal.back
    };
    this.editDialogVisible = true;
  }

  saveEdit(): void {
    if (!this.currentEditingProposal) return;

    const editedProposal: FlashcardProposalDTO = {
      ...this.currentEditingProposal,
      front: this.editedProposal.front,
      back: this.editedProposal.back,
      source: 'ai-edited'
    };

    this.edit.emit({
      original: this.currentEditingProposal,
      edited: editedProposal
    });

    this.closeEditDialog();
  }

  closeEditDialog(): void {
    this.editDialogVisible = false;
    this.currentEditingProposal = null;
    this.editedProposal = {front: '', back: ''};
  }
}
