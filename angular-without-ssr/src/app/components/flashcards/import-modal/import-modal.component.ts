import { Component, ChangeDetectionStrategy, input, output, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { FlashcardProposalDTO } from '../../../../types';
import { TextParserService, ParseError } from '../../../services/text-parser.service';

interface ImportProposal extends FlashcardProposalDTO {
  _id: string;
  accepted: boolean;
}

@Component({
  selector: 'app-import-modal',
  standalone: true,
  imports: [FormsModule, DialogModule],
  templateUrl: './import-modal.component.html',
  styleUrls: ['./import-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportModalComponent {
  private textParser = inject(TextParserService);

  isVisible = input.required<boolean>();
  setId = input.required<number>();
  isSaving = input(false);

  close = output<void>();
  saved = output<FlashcardProposalDTO[]>();

  rawText = signal('');
  proposals = signal<ImportProposal[]>([]);
  parseErrors = signal<ParseError[]>([]);
  isParsed = signal(false);
  editingId = signal<string | null>(null);

  acceptedCount = computed(() => this.proposals().filter(p => p.accepted).length);
  totalCount = computed(() => this.proposals().length);
  canSave = computed(() => this.acceptedCount() > 0 && !this.isSaving());
  hasContent = computed(() => this.rawText().trim().length > 0);

  onParse(): void {
    const result = this.textParser.parseKeyValue(this.rawText());
    this.proposals.set(
      result.proposals.map((p, i) => ({
        ...p,
        _id: `${Date.now()}-${i}`,
        accepted: true
      }))
    );
    this.parseErrors.set(result.errors);
    this.isParsed.set(true);
  }

  toggleAccept(id: string): void {
    this.proposals.update(list =>
      list.map(p => p._id === id ? { ...p, accepted: !p.accepted } : p)
    );
  }

  removeProposal(id: string): void {
    this.proposals.update(list => list.filter(p => p._id !== id));
  }

  startEdit(id: string): void {
    this.editingId.set(id);
  }

  saveEdit(id: string, front: string, back: string): void {
    const trimmedFront = front.trim();
    const trimmedBack = back.trim();
    if (!trimmedFront || !trimmedBack) return;

    this.proposals.update(list =>
      list.map(p => p._id === id ? { ...p, front: trimmedFront, back: trimmedBack } : p)
    );
    this.editingId.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  onSave(): void {
    const accepted = this.proposals()
      .filter(p => p.accepted)
      .map(({ front, back, source }) => ({ front, back, source }));
    this.saved.emit(accepted);
  }

  onClose(): void {
    this.rawText.set('');
    this.proposals.set([]);
    this.parseErrors.set([]);
    this.isParsed.set(false);
    this.editingId.set(null);
    this.close.emit();
  }

  resetToInput(): void {
    this.proposals.set([]);
    this.parseErrors.set([]);
    this.isParsed.set(false);
  }
}
