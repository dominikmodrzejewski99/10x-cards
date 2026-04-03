import { Injectable, signal, WritableSignal } from '@angular/core';

export type ToastSeverity = 'success' | 'error' | 'warn';

export interface ToastMessage {
  id: number;
  severity: ToastSeverity;
  summary: string;
  detail: string;
  life: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  private readonly _messages: WritableSignal<ToastMessage[]> = signal([]);

  readonly messages = this._messages.asReadonly();

  add(config: { severity: ToastSeverity; summary: string; detail: string; life?: number }): void {
    const id = ++this.nextId;
    const life = config.life ?? 4000;
    const msg: ToastMessage = { id, severity: config.severity, summary: config.summary, detail: config.detail, life };

    this._messages.update(msgs => [...msgs, msg]);

    setTimeout(() => this.remove(id), life);
  }

  remove(id: number): void {
    this._messages.update(msgs => msgs.filter(m => m.id !== id));
  }

  clear(): void {
    this._messages.set([]);
  }
}
