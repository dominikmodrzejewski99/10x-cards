import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { FeedbackApiService } from '../../services/feedback-api.service';
import { FeedbackType } from '../../../types';

@Component({
  selector: 'app-feedback',
  imports: [ReactiveFormsModule, TranslocoDirective, ToastModule],
  providers: [MessageService],
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedbackComponent {
  private fb: FormBuilder = inject(FormBuilder);
  private feedbackApi: FeedbackApiService = inject(FeedbackApiService);
  private messageService: MessageService = inject(MessageService);

  readonly submittingSignal = signal<boolean>(false);
  readonly submittedSignal = signal<boolean>(false);
  readonly selectedTypeSignal = signal<FeedbackType>('bug');

  public feedbackForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
  });

  selectType(type: FeedbackType): void {
    this.selectedTypeSignal.set(type);
  }

  submit(): void {
    if (this.feedbackForm.invalid || this.submittingSignal()) {
      this.feedbackForm.markAllAsTouched();
      return;
    }

    this.submittingSignal.set(true);

    this.feedbackApi.submitFeedback({
      type: this.selectedTypeSignal(),
      title: this.feedbackForm.value.title,
      description: this.feedbackForm.value.description,
    }).subscribe({
      next: () => {
        this.submittingSignal.set(false);
        this.submittedSignal.set(true);
        this.feedbackForm.reset();
        this.messageService.add({
          severity: 'success',
          summary: '',
          detail: this.selectedTypeSignal() === 'bug' ? 'Zgłoszenie wysłane!' : 'Pomysł wysłany!',
          life: 3000,
        });
      },
      error: () => {
        this.submittingSignal.set(false);
        this.messageService.add({
          severity: 'error',
          summary: '',
          detail: 'Nie udało się wysłać. Spróbuj ponownie.',
          life: 4000,
        });
      },
    });
  }

  sendAnother(): void {
    this.submittedSignal.set(false);
    this.selectedTypeSignal.set('bug');
  }
}
