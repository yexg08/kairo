import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * La marca: tres columnas de distinta altura dentro de un cuadrado. Es literalmente la forma
 * de un tablero kanban, así que el logo dice de qué va el producto sin escribirlo.
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-flex items-center gap-2.5">
      <span
        class="relative inline-flex items-center justify-center rounded-lg
               bg-gradient-to-br from-iris-400 to-iris-700 shadow-[0_0_20px_-6px_rgba(123,92,255,0.8)]"
        [style.width.px]="size()"
        [style.height.px]="size()"
      >
        <svg viewBox="0 0 24 24" class="h-[62%] w-[62%]" fill="white" aria-hidden="true">
          <rect x="3" y="5" width="4.5" height="14" rx="2" opacity="0.95" />
          <rect x="9.75" y="5" width="4.5" height="9" rx="2" opacity="0.8" />
          <rect x="16.5" y="5" width="4.5" height="11.5" rx="2" opacity="0.65" />
        </svg>
      </span>

      @if (showName()) {
        <span class="text-[15px] font-medium tracking-tight text-paper">Kairo</span>
      }
    </span>
  `
})
export class Logo {
  readonly size = input(28);
  readonly showName = input(true);
}
