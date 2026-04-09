import { Component, ChangeDetectionStrategy, input, output, signal, effect, InputSignal, OutputEmitterRef, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { DialogComponent } from '../../shared/components/dialog/dialog.component';
import { TagInputComponent } from '../../shared/components/tag-input/tag-input.component';
import { FlashcardSetDTO } from '../../../types';

export interface SetFormData {
  name: string;
  description: string | null;
  tags: string[];
}

@Component({
  selector: 'app-set-form-dialog',
  imports: [FormsModule, TranslocoDirective, DialogComponent, TagInputComponent],
  templateUrl: './set-form-dialog.component.html',
  styleUrls: ['./set-form-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetFormDialogComponent {
  public visible: InputSignal<boolean> = input.required<boolean>();
  public editingSet: InputSignal<FlashcardSetDTO | null> = input<FlashcardSetDTO | null>(null);
  public saving: InputSignal<boolean> = input<boolean>(false);

  public save: OutputEmitterRef<SetFormData> = output<SetFormData>();
  public close: OutputEmitterRef<void> = output<void>();

  public formNameSignal: WritableSignal<string> = signal<string>('');
  public formDescriptionSignal: WritableSignal<string> = signal<string>('');
  public formTagsSignal: WritableSignal<string[]> = signal<string[]>([]);

  constructor() {
    effect(() => {
      const set: FlashcardSetDTO | null = this.editingSet();
      if (set) {
        this.formNameSignal.set(set.name);
        this.formDescriptionSignal.set(set.description ?? '');
        this.formTagsSignal.set([...(set.tags ?? [])]);
      } else if (this.visible()) {
        this.formNameSignal.set('');
        this.formDescriptionSignal.set('');
        this.formTagsSignal.set([]);
      }
    });
  }

  public onSave(): void {
    const name: string = this.formNameSignal().trim();
    if (!name) return;

    this.save.emit({
      name,
      description: this.formDescriptionSignal().trim() || null,
      tags: this.formTagsSignal(),
    });
  }

  public onClose(): void {
    this.close.emit();
  }
}
