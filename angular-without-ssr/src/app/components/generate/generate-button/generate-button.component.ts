import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-generate-button',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './generate-button.component.html',
  styleUrls: ['./generate-button.component.css']
})
export class GenerateButtonComponent {
  @Input() label: string = 'Generuj Fiszki';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Output() generateClick = new EventEmitter<void>();

  onClick(): void {
    if (!this.disabled && !this.loading) {
      this.generateClick.emit();
    }
  }
}