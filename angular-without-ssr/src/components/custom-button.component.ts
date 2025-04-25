import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-custom-button',
  templateUrl: './custom-button.component.html',
  styleUrls: ['./custom-button.component.css']
})
export class CustomButtonComponent {
  @Input() label: string = 'Button';
  @Input() disabled: boolean = false;
  @Output() btnClick = new EventEmitter<Event>();

  handleClick(event: Event) {
    if (!this.disabled) {
      this.btnClick.emit(event);
    }
  }
} 