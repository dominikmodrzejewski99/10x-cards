import { Component, input, output, InputSignal, OutputEmitterRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-generate-button',
  imports: [CommonModule, ButtonModule],
  templateUrl: './generate-button.component.html',
  styleUrls: ['./generate-button.component.css']
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
