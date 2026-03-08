import { Component, input, InputSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-loading-indicator',
  imports: [CommonModule, ProgressSpinnerModule],
  templateUrl: './loading-indicator.component.html',
  styleUrls: ['./loading-indicator.component.css']
})
export class LoadingIndicatorComponent {
  public isLoadingSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'isLoading' });
}
