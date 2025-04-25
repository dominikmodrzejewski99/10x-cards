import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-source-textarea',
  standalone: true,
  imports: [CommonModule, FormsModule, TextareaModule],
  templateUrl: './source-textarea.component.html',
  styleUrls: ['./source-textarea.component.css']
})
export class SourceTextareaComponent implements OnInit {
  @Input() minLength: number = 1000;
  @Input() maxLength: number = 10000;
  @Output() textChange = new EventEmitter<string>();
  @Output() validityChange = new EventEmitter<boolean>();

  // Zmienna dla ngModel
  text: string = '';
  currentLength: number = 0;

  ngOnInit(): void {
    console.log('Inicjalizacja SourceTextareaComponent - nowa wersja');

    // Emituj początkową wartość i stan walidacji
    setTimeout(() => {
      this.textChange.emit('');
      this.validityChange.emit(false);
    }, 0);
  }

  // Metoda wywoływana przy każdej zmianie tekstu
  onTextChange(value: string): void {
    console.log('onTextChange:', value?.substring(0, 20) + (value?.length > 20 ? '...' : ''));

    // Zabezpieczenie przed undefined/null
    if (value === undefined || value === null) {
      value = '';
    }

    this.text = value;
    this.currentLength = value.length;

    // Emituj zdarzenia
    this.textChange.emit(value);

    // Sprawdź walidację
    const isValid = value.length >= this.minLength && value.length <= this.maxLength && value.trim() !== '';
    this.validityChange.emit(isValid);

    console.log('Emitowano textChange i validityChange:', value.length, isValid);
  }

  // Metoda do obsługi zdarzenia paste
  onPaste(event: ClipboardEvent): void {
    console.log('Zdarzenie paste');
    const pastedText = event.clipboardData?.getData('text');
    if (pastedText) {
      this.text = pastedText;
      this.onTextChange(pastedText);
    }
  }

  // Pomocnicze metody do sprawdzania błędów
  isTextEmpty(): boolean {
    return this.text.trim() === '' && this.currentLength > 0;
  }

  isTooShort(): boolean {
    return this.currentLength > 0 && this.currentLength < this.minLength;
  }

  isTooLong(): boolean {
    return this.currentLength > this.maxLength;
  }

  isTextValid(): boolean {
    return this.currentLength >= this.minLength &&
           this.currentLength <= this.maxLength &&
           this.text.trim() !== '';
  }
}
