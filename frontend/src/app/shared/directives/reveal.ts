import { Directive, ElementRef, OnDestroy, effect, inject, input } from '@angular/core';

/**
 * Aparición al entrar en pantalla. Con IntersectionObserver en vez de escuchar el scroll:
 * el navegador ya sabe cuándo un elemento es visible y no hace falta calcularlo en cada
 * fotograma.
 *
 * Si el sistema pide menos movimiento, el elemento nace visible y aquí no pasa nada más.
 */
@Directive({
  selector: '[appReveal]'
})
export class RevealDirective implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer: IntersectionObserver | null = null;

  /** Retardo en ms, para escalonar varios elementos de una misma fila. */
  readonly appReveal = input(0);

  constructor() {
    effect(() => {
      const delay = this.appReveal();
      const element = this.host.nativeElement;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        element.style.opacity = '1';
        return;
      }

      element.style.opacity = '0';

      this.observer?.disconnect();
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;

            element.style.animation = `rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both`;
            this.observer?.disconnect();
          }
        },
        { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
      );

      this.observer.observe(element);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
