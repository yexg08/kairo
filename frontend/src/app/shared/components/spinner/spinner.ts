import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Anillo de carga: un degradado cónico recortado con `mask` deja solo el borde girando.
 * Un solo elemento, sin SVG ni imágenes, y hereda el color del texto que lo rodea.
 */
@Component({
  selector: 'app-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-block animate-spin rounded-full
             bg-[conic-gradient(from_0deg,transparent_0%,currentColor_75%,currentColor_100%)]
             [mask:radial-gradient(farthest-side,transparent_calc(100%-2px),#000_calc(100%-2px))]"
      [style.width.px]="size()"
      [style.height.px]="size()"
      role="status"
      [attr.aria-label]="label()"
    ></span>
  `
})
export class Spinner {
  readonly size = input(18);
  readonly label = input('Cargando');
}
