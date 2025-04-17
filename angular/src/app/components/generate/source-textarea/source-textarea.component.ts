import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-source-textarea',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TextareaModule],
  templateUrl: './source-textarea.component.html',
  styleUrls: ['./source-textarea.component.css']
})
export class SourceTextareaComponent implements OnInit {
  @Input() minLength: number = 1000;
  @Input() maxLength: number = 10000;
  @Output() textChange = new EventEmitter<string>();
  @Output() validityChange = new EventEmitter<boolean>();
  
  textControl!: FormControl;
  currentLength: number = 0;
  
  ngOnInit(): void {
    this.textControl = new FormControl('', [
      Validators.required,
      Validators.minLength(this.minLength),
      Validators.maxLength(this.maxLength)
    ]);
    
    this.textControl.valueChanges.subscribe(value => {
      const text = value || '';
      this.currentLength = text.length;
      this.textChange.emit(text);
      this.validityChange.emit(this.textControl.valid);
    });
  }
  
  // Gettery pomocnicze dla szablonu HTML
  get hasMinLengthError(): boolean {
    return this.textControl?.hasError('minlength') && 
           this.textControl?.dirty && 
           !this.textControl?.hasError('maxlength');
  }
  
  get hasMaxLengthError(): boolean {
    return this.textControl?.hasError('maxlength') && 
           this.textControl?.dirty;
  }
  
  get hasRequiredError(): boolean {
    return this.textControl?.hasError('required') && 
           this.textControl?.dirty && 
           !this.hasMinLengthError && 
           !this.hasMaxLengthError;
  }
} 