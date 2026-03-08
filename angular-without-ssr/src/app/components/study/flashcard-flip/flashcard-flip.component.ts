import { Component, ChangeDetectionStrategy, input, output, InputSignal, OutputEmitterRef } from '@angular/core';

@Component({
  selector: 'app-flashcard-flip',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flashcard-flip.component.html',
  styleUrls: ['./flashcard-flip.component.scss']
})
export class FlashcardFlipComponent {
  public frontSignal: InputSignal<string> = input.required<string>({ alias: 'front' });
  public backSignal: InputSignal<string> = input.required<string>({ alias: 'back' });
  public isFlippedSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'isFlipped' });

  public flipToggle: OutputEmitterRef<void> = output<void>();

  public onFlip(): void {
    this.flipToggle.emit();
  }
}
