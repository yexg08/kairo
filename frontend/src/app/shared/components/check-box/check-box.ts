import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Casilla propia en vez de `<input type="checkbox">` estilado: el tick se dibuja con
 * stroke-dasharray para que se trace al marcar, en lugar de aparecer de golpe. Ese medio
 * segundo de trazo es lo que hace que marcar una subtarea se sienta como terminarla.
 *
 * Sigue siendo un `<button role="checkbox">`, así que teclado y lectores de pantalla lo
 * tratan como lo que es.
 */
@Component({
  selector: 'app-check-box',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .tick {
      stroke-dasharray: 24;
      stroke-dashoffset: 24;
      transition: stroke-dashoffset 0.28s cubic-bezier(0.65, 0, 0.35, 1);
    }
    .tick--on {
      stroke-dashoffset: 0;
    }
  `,
  template: `
    <button
      type="button"
      role="checkbox"
      class="group inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm
             border transition-colors duration-150"
      [class]="
        checked()
          ? 'border-iris-500 bg-iris-500'
          : 'border-smoke bg-transparent hover:border-iris-400/70'
      "
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      (click)="toggled.emit(!checked())"
    >
      <svg viewBox="0 0 24 24" class="h-3 w-3" fill="none" aria-hidden="true">
        <path
          class="tick"
          [class.tick--on]="checked()"
          d="M4 12.5l5 5 11-11"
          stroke="white"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  `
})
export class CheckBox {
  readonly checked = input.required<boolean>();
  readonly label = input('');
  readonly disabled = input(false);

  readonly toggled = output<boolean>();
}
