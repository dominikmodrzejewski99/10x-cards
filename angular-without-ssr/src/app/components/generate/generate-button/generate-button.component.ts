import { Component, input, output, InputSignal, OutputEmitterRef } from '@angular/core';

import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-generate-button',
  imports: [ButtonModule],
  templateUrl: './generate-button.component.html',
  styleUrls: ['./generate-button.component.scss']
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
