import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ToastService } from '../../shared/services/toast.service';
import { FeedbackApiService } from '../../services/feedback-api.service';
import { FeedbackType } from '../../../types';

@Component({
  selector: 'app-feedback',
  imports: [ReactiveFormsModule, TranslocoDirective],
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedbackComponent {
  private fb: FormBuilder = inject(FormBuilder);
  private feedbackApi: FeedbackApiService = inject(FeedbackApiService);
  private toastService: ToastService = inject(ToastService);
  private t: TranslocoService = inject(TranslocoService);

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
        this.toastService.add({
          severity: 'success',
          summary: '',
          detail: this.selectedTypeSignal() === 'bug' ? this.t.translate('feedback.toasts.bugSubmitted') : this.t.translate('feedback.toasts.ideaSubmitted'),
          life: 3000,
        });
      },
      error: () => {
        this.submittingSignal.set(false);
        this.toastService.add({
          severity: 'error',
          summary: '',
          detail: this.t.translate('feedback.toasts.submitFailed'),
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
