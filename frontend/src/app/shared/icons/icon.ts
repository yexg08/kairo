import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICON_PATHS, IconName } from './heroicons';

/**
 * Único punto por el que entran iconos en la app. Al recibir solo los paths, el trazo hereda
 * `currentColor` y el grosor se ajusta desde fuera: los iconos pequeños necesitan algo más
 * de grosor para no desaparecer sobre las superficies oscuras.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      class="shrink-0"
      [attr.stroke-width]="strokeWidth()"
      [style.width.px]="size()"
      [style.height.px]="size()"
    >
      @for (d of paths(); track d) {
        <path [attr.d]="d" />
      }
    </svg>
  `
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly strokeWidth = input(1.5);

  protected readonly paths = computed(() => ICON_PATHS[this.name()]);
}
