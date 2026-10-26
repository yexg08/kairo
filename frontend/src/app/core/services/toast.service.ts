import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const DISMISS_AFTER_MS = 4500;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly items = signal<Toast[]>([]);

  readonly toasts = this.items.asReadonly();

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((toast) => toast.id !== id));
  }

  private push(kind: ToastKind, message: string): void {
    const id = this.nextId++;

    // Si el mismo mensaje ya está en pantalla no se apila otra copia: cuando falla la
    // conexión, media docena de peticiones fallan a la vez con el mismo texto.
    if (this.items().some((toast) => toast.message === message)) return;

    this.items.update((list) => [...list, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), DISMISS_AFTER_MS);
  }
}
