import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-review-reminder',
  imports: [DialogModule],
  templateUrl: './review-reminder.component.html',
  styleUrls: ['./review-reminder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewReminderComponent {
  visible = input.required<boolean>();
  dueCount = input.required<number>();

  study = output<void>();
  dismiss = output<void>();

  onVisibleChange(value: boolean): void {
    if (!value) {
      this.dismiss.emit();
    }
  }

  onStudy(): void {
    this.study.emit();
  }

  onDismiss(): void {
    this.dismiss.emit();
  }
}
