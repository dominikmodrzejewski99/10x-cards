import { TranslocoDirective } from '@jsverse/transloco';
import { Component, ChangeDetectionStrategy, OnInit, input, output, InputSignal, OutputEmitterRef } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-source-textarea',
  imports: [FormsModule, TranslocoDirective],
  templateUrl: './source-textarea.component.html',
  styleUrls: ['./source-textarea.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SourceTextareaComponent implements OnInit {
  public minLengthSignal: InputSignal<number> = input<number>(1000, { alias: 'minLength' });
  public maxLengthSignal: InputSignal<number> = input<number>(10000, { alias: 'maxLength' });

  public textChange: OutputEmitterRef<string> = output<string>();
  public validityChange: OutputEmitterRef<boolean> = output<boolean>();

  text: string = '';
  currentLength: number = 0;
  touched: boolean = false;

  get progressPercent(): number {
    return Math.min((this.currentLength / this.minLengthSignal()) * 100, 100);
  }

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

  onBlur(): void {
    if (this.currentLength > 0) {
      this.touched = true;
    }
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
