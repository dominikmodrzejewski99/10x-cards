import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-message.component.html',
  styleUrls: ['./error-message.component.css']
})
export class ErrorMessageComponent implements OnChanges {
  @Input() errorMessage: string | null = null;
  @Output() dismiss = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['errorMessage'] && changes['errorMessage'].currentValue) {
      console.log('Wyświetlenie błędu:', this.errorMessage);
    }
  }

  dismissError(): void {
    this.errorMessage = null;
    this.dismiss.emit();
  }
} 