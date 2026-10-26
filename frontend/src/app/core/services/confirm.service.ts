import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

/**
 * Confirmaciones como promesa: `if (await confirm.ask({...}))`. El diálogo lo pinta
 * `ConfirmHost`, montado una sola vez en el shell, así que ninguna pantalla necesita
 * arrastrar su propio modal ni una bandera de estado por cada acción destructiva.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly pendingConfirm = signal<PendingConfirm | null>(null);

  readonly pending = this.pendingConfirm.asReadonly();

  ask(options: ConfirmOptions): Promise<boolean> {
    // Si ya había uno abierto se resuelve en negativo: dos diálogos apilados no ayudan.
    this.pendingConfirm()?.resolve(false);

    return new Promise<boolean>((resolve) => {
      this.pendingConfirm.set({ ...options, resolve });
    });
  }

  respond(confirmed: boolean): void {
    const current = this.pendingConfirm();
    if (!current) return;

    this.pendingConfirm.set(null);
    current.resolve(confirmed);
  }
}
