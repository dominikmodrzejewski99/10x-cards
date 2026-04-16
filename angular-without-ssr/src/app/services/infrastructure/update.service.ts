import { inject, Injectable, ApplicationRef, OnDestroy } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { TranslocoService } from '@jsverse/transloco';
import { Observable, Subscription, concat, interval, filter, first } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UpdateService implements OnDestroy {
  private readonly swUpdate: SwUpdate = inject(SwUpdate);
  private readonly appRef: ApplicationRef = inject(ApplicationRef);
  private readonly t: TranslocoService = inject(TranslocoService);
  private readonly subscriptions: Subscription[] = [];

  public checkForUpdates(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    // Wait for app to stabilize before polling for updates
    const appIsStable$: Observable<boolean> = this.appRef.isStable.pipe(
      first((isStable: boolean) => isStable)
    );
    const everySixHours$: Observable<number> = interval(6 * 60 * 60 * 1000);
    const everySixHoursOnceAppIsStable$: Observable<number | boolean> = concat(
      appIsStable$,
      everySixHours$
    );

    this.subscriptions.push(
      everySixHoursOnceAppIsStable$.subscribe((): void => {
        this.swUpdate.checkForUpdate();
      })
    );

    // Listen for new versions and prompt user to reload
    this.subscriptions.push(
      this.swUpdate.versionUpdates
        .pipe(filter((event: { type: string }): event is VersionReadyEvent => event.type === 'VERSION_READY'))
        .subscribe((): void => {
          const shouldUpdate: boolean = confirm(
            this.t.translate('update.newVersionAvailable')
          );
          if (shouldUpdate) {
            document.location.reload();
          }
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
