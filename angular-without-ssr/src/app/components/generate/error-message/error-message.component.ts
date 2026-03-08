import { Component, input, output, InputSignal, OutputEmitterRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-message',
  imports: [CommonModule],
  templateUrl: './error-message.component.html',
  styleUrls: ['./error-message.component.css']
})
export class ErrorMessageComponent {
  public errorMessageSignal: InputSignal<string | null> = input<string | null>(null, { alias: 'errorMessage' });

  public dismiss: OutputEmitterRef<void> = output<void>();

  dismissError(): void {
    this.dismiss.emit();
  }
}
