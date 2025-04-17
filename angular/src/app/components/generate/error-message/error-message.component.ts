import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagesModule } from 'primeng/messages';

@Component({
  selector: 'app-error-message',
  standalone: true,
  imports: [CommonModule, MessagesModule],
  templateUrl: './error-message.component.html',
  styleUrls: ['./error-message.component.css']
})
export class ErrorMessageComponent {
  @Input() set errorMessage(value: string | null) {
    if (value) {
      this.messages = [
        { severity: 'error', summary: 'Błąd', detail: value, closable: true }
      ];
    } else {
      this.messages = [];
    }
  }
  
  messages: any[] = [];
} 