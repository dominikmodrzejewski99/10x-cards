import { Component, ChangeDetectionStrategy, input, output, InputSignal, OutputEmitterRef } from '@angular/core';

@Component({
  selector: 'app-error-message',
  imports: [],
  templateUrl: './error-message.component.html',
  styleUrls: ['./error-message.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorMessageComponent {
  public errorMessageSignal: InputSignal<string | null> = input<string | null>(null, { alias: 'errorMessage' });

  public retrySignal: InputSignal<boolean> = input<boolean>(true, { alias: 'showRetry' });
  public dismiss: OutputEmitterRef<void> = output<void>();
  public retry: OutputEmitterRef<void> = output<void>();

  dismissError(): void {
    this.dismiss.emit();
  }

  retryAction(): void {
    this.retry.emit();
  }
}
