import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  input,
  output,
  effect,
  inject,
  OnDestroy,
  TemplateRef,
  viewChild,
  ViewContainerRef
} from '@angular/core';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

@Component({
  selector: 'app-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OverlayModule],
  template: `
    <ng-template #dialogTpl>
      <div class="app-dialog-panel"
           [style.max-width]="isMobile() ? 'none' : maxWidth()"
           role="dialog"
           aria-modal="true"
           [attr.aria-label]="header()">
        <div class="app-dialog-header">
          <h2 class="app-dialog-title">{{ header() }}</h2>
          <button type="button" class="app-dialog-close" (click)="close()" aria-label="Zamknij">
            <i class="pi pi-times" aria-hidden="true"></i>
          </button>
        </div>
        <div class="app-dialog-body">
          <ng-content />
        </div>
        <div class="app-dialog-footer">
          <ng-content select="[dialogFooter]" />
        </div>
      </div>
    </ng-template>
  `,
  styleUrl: './dialog.component.scss'
})
export class DialogComponent implements OnDestroy {
  header = input.required<string>();
  visible = input.required<boolean>();
  maxWidth = input<string>('480px');
  dismissableMask = input<boolean>(true);

  visibleChange = output<boolean>();
  onHide = output<void>();

  private overlay = inject(Overlay);
  private vcr = inject(ViewContainerRef);
  private dialogTpl = viewChild.required<TemplateRef<unknown>>('dialogTpl');

  private overlayRef: OverlayRef | null = null;
  private readonly MOBILE_BREAKPOINT = 480;

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.openOverlay();
      } else {
        this.closeOverlay();
      }
    });
  }

  ngOnDestroy(): void {
    this.closeOverlay();
  }

  close(): void {
    this.visibleChange.emit(false);
    this.onHide.emit();
  }

  isMobile(): boolean {
    return window.innerWidth <= this.MOBILE_BREAKPOINT;
  }

  private openOverlay(): void {
    if (this.overlayRef) return;

    const mobile = this.isMobile();
    const position = this.overlay.position().global().centerHorizontally().centerVertically();

    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'app-dialog-backdrop',
      panelClass: mobile ? ['app-dialog-wrapper', 'app-dialog-wrapper--mobile'] : 'app-dialog-wrapper',
      positionStrategy: position,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      disposeOnNavigation: true,
    });

    const portal = new TemplatePortal(this.dialogTpl(), this.vcr);
    this.overlayRef.attach(portal);

    if (this.dismissableMask()) {
      this.overlayRef.backdropClick().subscribe(() => this.close());
    }

    this.overlayRef.keydownEvents().subscribe(event => {
      if (event.key === 'Escape') {
        this.close();
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
