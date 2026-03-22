import { Component, ChangeDetectionStrategy, input, output, InputSignal, OutputEmitterRef } from '@angular/core';
import { AudioPlayerComponent } from '../../../shared/components/audio-player/audio-player.component';

@Component({
  selector: 'app-flashcard-flip',
  imports: [AudioPlayerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flashcard-flip.component.html',
  styleUrls: ['./flashcard-flip.component.scss']
})
export class FlashcardFlipComponent {
  public frontSignal: InputSignal<string> = input.required<string>({ alias: 'front' });
  public backSignal: InputSignal<string> = input.required<string>({ alias: 'back' });
  public frontImageUrlSignal: InputSignal<string | null> = input<string | null>(null, { alias: 'frontImageUrl' });
  public isFlippedSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'isFlipped' });
  public skipTransitionSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'skipTransition' });
  public backAudioUrlSignal: InputSignal<string | null> = input<string | null>(null, { alias: 'backAudioUrl' });

  public flipToggle: OutputEmitterRef<void> = output<void>();

  public onFlip(): void {
    this.flipToggle.emit();
  }
}
