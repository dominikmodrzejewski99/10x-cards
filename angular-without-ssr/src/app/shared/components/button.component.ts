import { Component, ChangeDetectionStrategy, input, output, InputSignal, OutputEmitterRef } from '@angular/core';

export type ButtonVariant = 'primary' | 'success' | 'danger' | 'warning' | 'purple' | 'ghost' | 'outline' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-btn',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [class]="buttonClasses()"
      [disabled]="disabledSignal()"
      [type]="typeSignal()"
      (click)="onClick($event)">
      <ng-content />
    </button>
  `,
  styleUrl: './button.component.scss'
})
export class ButtonComponent {
  public variantSignal: InputSignal<ButtonVariant> = input<ButtonVariant>('primary', { alias: 'variant' });
  public sizeSignal: InputSignal<ButtonSize> = input<ButtonSize>('md', { alias: 'size' });
  public disabledSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'disabled' });
  public typeSignal: InputSignal<'button' | 'submit'> = input<'button' | 'submit'>('button', { alias: 'type' });

  public btnClick: OutputEmitterRef<Event> = output<Event>();

  public onClick(event: Event): void {
    if (!this.disabledSignal()) {
      this.btnClick.emit(event);
    }
  }

  public buttonClasses(): string {
    return `btn btn--${this.variantSignal()} btn--${this.sizeSignal()}`;
  }
}
