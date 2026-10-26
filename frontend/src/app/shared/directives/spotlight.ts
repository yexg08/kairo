import { Directive, ElementRef, inject } from '@angular/core';

/**
 * Foco de luz que sigue al cursor por encima de la tarjeta. En vez de reaccionar en Angular
 * a cada `mousemove`, la directiva solo escribe dos variables CSS y el degradado del propio
 * elemento se encarga del resto; no hay detección de cambios de por medio.
 *
 * El elemento debe declarar el degradado que consume `--spot-x` / `--spot-y`.
 */
@Directive({
  selector: '[appSpotlight]',
  host: {
    '(pointermove)': 'onMove($event)',
    '(pointerleave)': 'onLeave()'
  }
})
export class SpotlightDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onMove(event: PointerEvent): void {
    const element = this.host.nativeElement;
    const rect = element.getBoundingClientRect();

    element.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    element.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
    element.style.setProperty('--spot-opacity', '1');
  }

  protected onLeave(): void {
    this.host.nativeElement.style.setProperty('--spot-opacity', '0');
  }
}
