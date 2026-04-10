import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { FeedbackFacadeService } from '../../services/feedback-facade.service';

@Component({
  selector: 'app-feedback',
  imports: [ReactiveFormsModule, TranslocoDirective],
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedbackComponent {
  private fb: FormBuilder = inject(FormBuilder);
  public readonly facade: FeedbackFacadeService = inject(FeedbackFacadeService);

  public feedbackForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
  });

  public submit(): void {
    if (this.feedbackForm.invalid || this.facade.submittingSignal()) {
      this.feedbackForm.markAllAsTouched();
      return;
    }

    this.facade.submit({
      type: this.facade.selectedTypeSignal(),
      title: this.feedbackForm.value.title,
      description: this.feedbackForm.value.description,
    });

    this.feedbackForm.reset();
  }
}
