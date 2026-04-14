import { Component, ChangeDetectionStrategy, input, output, InputSignal, OutputEmitterRef } from '@angular/core';

@Component({
  selector: 'app-generate-button',
  imports: [],
  templateUrl: './generate-button.component.html',
  styleUrls: ['./generate-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GenerateButtonComponent {
  public labelSignal: InputSignal<string> = input<string>('Generuj Fiszki', { alias: 'label' });
  public disabledSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'disabled' });
  public loadingSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'loading' });

  public generateClick: OutputEmitterRef<void> = output<void>();

  onClick(): void {
    if (!this.disabledSignal() && !this.loadingSignal()) {
      this.generateClick.emit();
    }
  }
}
