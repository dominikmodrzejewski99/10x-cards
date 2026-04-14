import {
  Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, ElementRef, effect,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { NgClass } from '@angular/common';
import { NotificationFacadeService } from '../../../services/facades/notification-facade.service';

@Component({
  selector: 'app-notification-bell',
  imports: [TranslocoDirective, NgClass],
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  readonly facade: NotificationFacadeService = inject(NotificationFacadeService);
  private readonly router: Router = inject(Router);
  private readonly elementRef: ElementRef = inject(ElementRef);

  constructor() {
    effect(() => {
      const target = this.facade.navigationTargetSignal();
      if (target) {
        this.router.navigate(target.route, {
          queryParams: target.queryParams,
        });
        this.facade.clearNavigationTarget();
      }
    });
  }

  ngOnInit(): void {
    this.facade.init();
  }

  ngOnDestroy(): void {
    this.facade.destroy();
  }

  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.facade.closePanel();
    }
  }
}
