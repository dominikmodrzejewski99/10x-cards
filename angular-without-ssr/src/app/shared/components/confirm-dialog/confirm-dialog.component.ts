import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  inject,
  effect,
  OnDestroy,
  TemplateRef,
  viewChild,
  ViewContainerRef
} from '@angular/core';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OverlayModule],
  template: `
    <ng-template #confirmTpl>
      @if (confirmService.active(); as cfg) {
        <div class="app-confirm-panel"
             role="alertdialog"
             aria-modal="true"
             [attr.aria-label]="cfg.header">
          @if (cfg.icon) {
            <div class="app-confirm-icon">
              <i [class]="'pi ' + cfg.icon" aria-hidden="true"></i>
            </div>
          }
          <h3 class="app-confirm-title">{{ cfg.header }}</h3>
          <p class="app-confirm-text">{{ cfg.message }}</p>
          <div class="app-confirm-actions">
            <button type="button" class="app-confirm-btn app-confirm-btn--cancel" (click)="confirmService.reject()">
              {{ cfg.rejectLabel || 'Nie' }}
            </button>
            <button
              type="button"
              class="app-confirm-btn"
              [class.app-confirm-btn--primary]="cfg.acceptClass !== 'danger'"
              [class.app-confirm-btn--danger]="cfg.acceptClass === 'danger'"
              (click)="confirmService.accept()">
              {{ cfg.acceptLabel || 'Tak' }}
            </button>
          </div>
        </div>
      }
    </ng-template>
  `,
  styleUrl: './confirm-dialog.component.scss'
})
export class ConfirmDialogComponent implements OnDestroy {
  readonly confirmService = inject(ConfirmService);
  private overlay = inject(Overlay);
  private vcr = inject(ViewContainerRef);
  private confirmTpl = viewChild.required<TemplateRef<unknown>>('confirmTpl');

  private overlayRef: OverlayRef | null = null;

  constructor() {
    effect(() => {
      if (this.confirmService.active()) {
        this.openOverlay();
      } else {
        this.closeOverlay();
      }
    });
  }

  ngOnDestroy(): void {
    this.closeOverlay();
  }

  private openOverlay(): void {
    if (this.overlayRef) return;

    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'app-confirm-backdrop',
      panelClass: 'app-confirm-wrapper',
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
    });

    const portal = new TemplatePortal(this.confirmTpl(), this.vcr);
    this.overlayRef.attach(portal);

    this.overlayRef.backdropClick().subscribe(() => this.confirmService.reject());
    this.overlayRef.keydownEvents().subscribe(event => {
      if (event.key === 'Escape') {
        this.confirmService.reject();
      }
    });
  }

  private closeOverlay(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }
}
