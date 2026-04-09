import { Component, ChangeDetectionStrategy, input, output, InputSignal, OutputEmitterRef } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { FlashcardSetDTO } from '../../../types';

@Component({
  selector: 'app-set-card',
  imports: [TranslocoDirective],
  templateUrl: './set-card.component.html',
  styleUrls: ['./set-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetCardComponent {
  public set: InputSignal<FlashcardSetDTO> = input.required<FlashcardSetDTO>();

  public navigate: OutputEmitterRef<void> = output<void>();
  public edit: OutputEmitterRef<void> = output<void>();
  public delete: OutputEmitterRef<void> = output<void>();
  public study: OutputEmitterRef<void> = output<void>();
  public quiz: OutputEmitterRef<void> = output<void>();
  public share: OutputEmitterRef<void> = output<void>();
  public publish: OutputEmitterRef<void> = output<void>();
  public unpublish: OutputEmitterRef<void> = output<void>();

  public formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
