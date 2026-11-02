import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  /** Translation key. */
  message: string;
  params?: Record<string, unknown>;
  kind: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly toasts = signal<Toast[]>([]);

  /** `message` is a translation key; `params` fill its {{placeholders}}. */
  show(
    message: string,
    params?: Record<string, unknown>,
    kind: Toast['kind'] = 'success',
    ms = 3500,
  ) {
    const id = ++this.nextId;
    this.toasts.update((t) => [...t, { id, message, params, kind }]);
    setTimeout(() => this.dismiss(id), ms);
  }

  dismiss(id: number) {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
