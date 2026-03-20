import { Component, input, output, InputSignal, OutputEmitterRef } from '@angular/core';


@Component({
  selector: 'app-error-message',
  imports: [],
  templateUrl: './error-message.component.html',
  styleUrls: ['./error-message.component.scss']
})
export class ErrorMessageComponent {
  public errorMessageSignal: InputSignal<string | null> = input<string | null>(null, { alias: 'errorMessage' });

  public dismiss: OutputEmitterRef<void> = output<void>();

  dismissError(): void {
    this.dismiss.emit();
  }
}
