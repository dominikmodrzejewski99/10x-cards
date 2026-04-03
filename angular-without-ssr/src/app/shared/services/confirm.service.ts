import { Injectable, signal } from '@angular/core';

export interface ConfirmConfig {
  message: string;
  header: string;
  icon?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptClass?: string;
}

interface ActiveConfirm extends ConfirmConfig {
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly _active = signal<ActiveConfirm | null>(null);
  readonly active = this._active.asReadonly();

  confirm(config: ConfirmConfig): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      this._active.set({ ...config, resolve });
    });
  }

  accept(): void {
    this._active()?.resolve(true);
    this._active.set(null);
  }

  reject(): void {
    this._active()?.resolve(false);
    this._active.set(null);
  }
}
