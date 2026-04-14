import { Injectable, signal, WritableSignal, OnDestroy } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConnectivityService implements OnDestroy {
  public onlineSignal: WritableSignal<boolean> = signal<boolean>(navigator.onLine);

  private onlineHandler: () => void = () => this.onlineSignal.set(true);
  private offlineHandler: () => void = () => this.onlineSignal.set(false);

  constructor() {
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
  }

  public ngOnDestroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
  }
}
