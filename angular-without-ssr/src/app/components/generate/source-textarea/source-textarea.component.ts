import { Component, OnInit, input, output, InputSignal, OutputEmitterRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-source-textarea',
  imports: [CommonModule, FormsModule, TextareaModule],
  templateUrl: './source-textarea.component.html',
  styleUrls: ['./source-textarea.component.css']
})
export class SourceTextareaComponent implements OnInit {
  public minLengthSignal: InputSignal<number> = input<number>(1000, { alias: 'minLength' });
  public maxLengthSignal: InputSignal<number> = input<number>(10000, { alias: 'maxLength' });

  public textChange: OutputEmitterRef<string> = output<string>();
  public validityChange: OutputEmitterRef<boolean> = output<boolean>();

  text: string = '';
  currentLength: number = 0;

  ngOnInit(): void {
    setTimeout(() => {
      this.textChange.emit('');
      this.validityChange.emit(false);
    }, 0);
  }

  onTextChange(value: string): void {
    if (value === undefined || value === null) {
      value = '';
    }

    this.currentLength = value.length;
    this.textChange.emit(value);

    const isValid = value.length >= this.minLengthSignal() && value.length <= this.maxLengthSignal() && value.trim() !== '';
    this.validityChange.emit(isValid);
  }

  isTextEmpty(): boolean {
    return this.text.trim() === '' && this.currentLength > 0;
  }

  isTooShort(): boolean {
    return this.currentLength > 0 && this.currentLength < this.minLengthSignal();
  }

  isTooLong(): boolean {
    return this.currentLength > this.maxLengthSignal();
  }

  isTextValid(): boolean {
    return this.currentLength >= this.minLengthSignal() &&
           this.currentLength <= this.maxLengthSignal() &&
           this.text.trim() !== '';
  }
}
