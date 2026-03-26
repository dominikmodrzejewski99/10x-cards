import { Component, input, output, InputSignal, OutputEmitterRef } from '@angular/core';

@Component({
  selector: 'app-bulk-save-button',
  imports: [],
  templateUrl: './bulk-save-button.component.html',
  styleUrls: ['./bulk-save-button.component.scss']
})
export class BulkSaveButtonComponent {
  public labelSignal: InputSignal<string> = input<string>('Zapisz wszystkie propozycje', { alias: 'label' });
  public disabledSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'disabled' });
  public loadingSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'loading' });

  public saveAllClick: OutputEmitterRef<void> = output<void>();

  onClick(): void {
    if (!this.disabledSignal() && !this.loadingSignal()) {
      this.saveAllClick.emit();
    }
  }
}
