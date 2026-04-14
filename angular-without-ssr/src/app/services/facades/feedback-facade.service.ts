import { Injectable, inject, signal, Signal, WritableSignal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { FeedbackApiService } from '../api/feedback-api.service';
import { ToastService } from '../../shared/services/toast.service';
import { FeedbackType } from '../../../types';

@Injectable({ providedIn: 'root' })
export class FeedbackFacadeService {
  private readonly feedbackApi: FeedbackApiService = inject(FeedbackApiService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly t: TranslocoService = inject(TranslocoService);

  private readonly _submitting: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _submitted: WritableSignal<boolean> = signal<boolean>(false);
  private readonly _selectedType: WritableSignal<FeedbackType> = signal<FeedbackType>('bug');

  public readonly submittingSignal: Signal<boolean> = this._submitting.asReadonly();
  public readonly submittedSignal: Signal<boolean> = this._submitted.asReadonly();
  public readonly selectedTypeSignal: Signal<FeedbackType> = this._selectedType.asReadonly();

  public selectType(type: FeedbackType): void {
    this._selectedType.set(type);
  }

  public submit(data: { type: FeedbackType; title: string; description: string }): void {
    this._submitting.set(true);

    this.feedbackApi.submitFeedback(data).subscribe({
      next: () => {
        this._submitting.set(false);
        this._submitted.set(true);
        this.toastService.add({
          severity: 'success',
          summary: '',
          detail: data.type === 'bug'
            ? this.t.translate('feedback.toasts.bugSubmitted')
            : this.t.translate('feedback.toasts.ideaSubmitted'),
          life: 3000,
        });
      },
      error: () => {
        this._submitting.set(false);
        this.toastService.add({
          severity: 'error',
          summary: '',
          detail: this.t.translate('feedback.toasts.submitFailed'),
          life: 4000,
        });
      },
    });
  }

  public sendAnother(): void {
    this._submitted.set(false);
    this._selectedType.set('bug');
  }
}
