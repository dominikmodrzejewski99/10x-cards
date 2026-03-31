import { Component, ChangeDetectionStrategy, input, output, signal, effect } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'app-review-reminder',
  imports: [DialogModule, TranslocoDirective],
  templateUrl: './review-reminder.component.html',
  styleUrls: ['./review-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewReminderComponent {
  visible = input.required<boolean>();
  dueCount = input.required<number>();

  study = output<void>();
  dismiss = output<void>();

  dialogVisible = signal(false);

  constructor() {
    effect(() => {
      this.dialogVisible.set(this.visible());
    });
  }

  onHide(): void {
    this.dialogVisible.set(false);
    this.dismiss.emit();
  }

  onStudy(): void {
    this.dialogVisible.set(false);
    this.study.emit();
  }

  onDismiss(): void {
    this.dialogVisible.set(false);
    this.dismiss.emit();
  }
}
