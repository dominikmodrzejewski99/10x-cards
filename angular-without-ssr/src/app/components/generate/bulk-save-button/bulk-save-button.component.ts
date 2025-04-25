import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-bulk-save-button',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './bulk-save-button.component.html',
  styleUrls: ['./bulk-save-button.component.css']
})
export class BulkSaveButtonComponent {
  @Input() label: string = 'Zapisz wszystkie propozycje';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Output() saveAllClick = new EventEmitter<void>();
  
  onClick(): void {
    if (!this.disabled && !this.loading) {
      this.saveAllClick.emit();
    }
  }
} 