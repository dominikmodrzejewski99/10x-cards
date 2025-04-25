import { Component, Input, Output, EventEmitter } from '@angular/core';
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
  standalone: true,
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
  @Input() proposals: FlashcardProposalDTO[] = [];

  // Emittery dla akcji na fiszkach
  @Output() accept = new EventEmitter<FlashcardProposalDTO>();
  @Output() reject = new EventEmitter<FlashcardProposalDTO>();
  @Output() edit = new EventEmitter<{original: FlashcardProposalDTO, edited: FlashcardProposalDTO}>();

  // Zmienne dla dialogu edycji
  editDialogVisible = false;
  currentEditingProposal: FlashcardProposalDTO | null = null;
  editedProposal: {front: string, back: string} = {front: '', back: ''};

  // Metoda do akceptacji fiszki
  onAccept(proposal: FlashcardProposalDTO): void {
    this.accept.emit(proposal);
  }

  // Metoda do odrzucenia fiszki
  onReject(proposal: FlashcardProposalDTO): void {
    this.reject.emit(proposal);
  }

  // Metoda do otwarcia dialogu edycji
  openEditDialog(proposal: FlashcardProposalDTO): void {
    this.currentEditingProposal = {...proposal};
    this.editedProposal = {
      front: proposal.front,
      back: proposal.back
    };
    this.editDialogVisible = true;
  }

  // Metoda do zapisania edytowanej fiszki
  saveEdit(): void {
    if (!this.currentEditingProposal) return;

    const editedProposal: FlashcardProposalDTO = {
      ...this.currentEditingProposal,
      front: this.editedProposal.front,
      back: this.editedProposal.back,
      source: 'ai-edited' // Zmiana źródła na ai-edited, ponieważ fiszka została zmodyfikowana
    };

    this.edit.emit({
      original: this.currentEditingProposal,
      edited: editedProposal
    });

    this.closeEditDialog();
  }

  // Metoda do zamknięcia dialogu edycji
  closeEditDialog(): void {
    this.editDialogVisible = false;
    this.currentEditingProposal = null;
    this.editedProposal = {front: '', back: ''};
  }
}