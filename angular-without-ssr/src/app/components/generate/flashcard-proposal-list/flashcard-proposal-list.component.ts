import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { FlashcardProposalDTO } from '../../../../types';

@Component({
  selector: 'app-flashcard-proposal-list',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './flashcard-proposal-list.component.html',
  styleUrls: ['./flashcard-proposal-list.component.css']
})
export class FlashcardProposalListComponent {
  @Input() proposals: FlashcardProposalDTO[] = [];
} 