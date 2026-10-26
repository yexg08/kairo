import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';
import { BtnDirective } from '../../design/button';
import { Modal } from '../modal/modal';

@Component({
  selector: 'app-confirm-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BtnDirective, Modal],
  template: `
    <app-modal
      size="sm"
      [open]="isOpen()"
      [title]="pending()?.title ?? ''"
      (close)="confirm.respond(false)"
    >
      <p class="text-sm leading-relaxed text-mist">{{ pending()?.message }}</p>

      <div class="mt-6 flex justify-end gap-2">
        <button type="button" appBtn="ghost" (click)="confirm.respond(false)">
          {{ pending()?.cancelLabel ?? 'Cancelar' }}
        </button>
        <button
          type="button"
          [appBtn]="pending()?.danger ? 'danger' : 'primary'"
          (click)="confirm.respond(true)"
        >
          {{ pending()?.confirmLabel ?? 'Confirmar' }}
        </button>
      </div>
    </app-modal>
  `
})
export class ConfirmHost {
  protected readonly confirm = inject(ConfirmService);
  protected readonly pending = this.confirm.pending;
  protected readonly isOpen = computed(() => this.pending() !== null);
}
