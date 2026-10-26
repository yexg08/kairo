import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../icons/icon';
import { IconName } from '../../icons/heroicons';
import { ToastKind } from '../../../core/services/toast.service';

const KIND_ICON: Record<ToastKind, IconName> = {
  success: 'check-circle',
  error: 'exclamation-triangle',
  info: 'information-circle'
};

const KIND_CLASS: Record<ToastKind, string> = {
  success: 'text-emerald-300',
  error: 'text-rose-300',
  info: 'text-iris-300'
};

@Component({
  selector: 'app-toast-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <!-- aria-live para que un lector de pantalla anuncie lo que aparece sin robar el foco. -->
    <div
      class="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4
             sm:inset-x-auto sm:right-0 sm:items-end"
      role="status"
      aria-live="polite"
    >
      @for (toast of toasts(); track toast.id) {
        <div
          class="animate-slide-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg
                 bg-carbon/95 p-3 pr-2 shadow-lifted ring-1 ring-graphite backdrop-blur-sm"
        >
          <app-icon
            class="mt-0.5"
            [name]="icon(toast.kind)"
            [class]="iconClass(toast.kind)"
            [size]="18"
          />
          <p class="flex-1 text-sm leading-snug text-mist">{{ toast.message }}</p>
          <button
            type="button"
            class="rounded-md p-1 text-ash transition-colors hover:bg-obsidian hover:text-paper"
            aria-label="Cerrar aviso"
            (click)="toastService.dismiss(toast.id)"
          >
            <app-icon name="x-mark" [size]="14" />
          </button>
        </div>
      }
    </div>
  `
})
export class ToastStack {
  protected readonly toastService = inject(ToastService);
  protected readonly toasts = this.toastService.toasts;

  protected icon(kind: ToastKind): IconName {
    return KIND_ICON[kind];
  }

  protected iconClass(kind: ToastKind): string {
    return KIND_CLASS[kind];
  }
}
