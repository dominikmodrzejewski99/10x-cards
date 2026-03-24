import { inject, Injectable, ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Observable, concat, interval, filter, first } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly swUpdate: SwUpdate = inject(SwUpdate);
  private readonly appRef: ApplicationRef = inject(ApplicationRef);

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

    everySixHoursOnceAppIsStable$.subscribe((): void => {
      this.swUpdate.checkForUpdate();
    });

    // Listen for new versions and prompt user to reload
    this.swUpdate.versionUpdates
      .pipe(filter((event: { type: string }): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe((): void => {
        const shouldUpdate: boolean = confirm(
          'Dostępna jest nowa wersja aplikacji. Czy chcesz ją załadować?'
        );
        if (shouldUpdate) {
          document.location.reload();
        }
      });
  }
}
