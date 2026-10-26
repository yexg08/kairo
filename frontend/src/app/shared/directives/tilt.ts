import { Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Inclinación 3D suave siguiendo al puntero. Se usa con cuentagotas: solo en la maqueta de
 * tablero del hero, donde el gesto sugiere que eso es un objeto manipulable, que es
 * justamente de lo que va el producto.
 */
@Directive({
  selector: '[appTilt]',
  host: {
    '(pointermove)': 'onMove($event)',
    '(pointerleave)': 'onLeave()'
  }
})
export class TiltDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Inclinación máxima en grados. */
  readonly appTilt = input(6);

  private get reducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  protected onMove(event: PointerEvent): void {
    if (this.reducedMotion) return;

    const element = this.host.nativeElement;
    const rect = element.getBoundingClientRect();

    // -0.5..0.5 respecto al centro del elemento.
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    const max = this.appTilt();

    element.style.transform =
      `perspective(1200px) rotateY(${px * max}deg) rotateX(${-py * max}deg) translateZ(0)`;
  }

  protected onLeave(): void {
    this.host.nativeElement.style.transform = '';
  }
}
