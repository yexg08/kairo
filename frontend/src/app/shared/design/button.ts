import { Directive, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'subtle' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium ' +
  'transition-[background-color,border-color,color,transform,box-shadow] duration-150 ' +
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iris-500';

const VARIANTS: Record<ButtonVariant, string> = {
  // Un solo primario por vista: es el color de acción y pierde fuerza si se reparte.
  primary: 'bg-iris-500 text-white hover:bg-iris-400 shadow-[0_0_0_1px_rgba(155,140,255,0.25)]',
  subtle: 'bg-obsidian text-mist hairline hover:bg-graphite hover:text-paper',
  ghost: 'text-fog hover:bg-obsidian hover:text-paper',
  danger: 'bg-signal-danger/10 text-rose-300 hairline hover:bg-signal-danger/20 hover:text-rose-200',
  icon: 'text-fog hover:bg-obsidian hover:text-paper'
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-base'
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-10 w-10'
};

/**
 * Los botones son utilidades de Tailwind, pero repartidas por una directiva en vez de
 * copiadas en cada plantilla: así "el primario" es una decisión y no veinte cadenas de
 * clases que se van separando entre sí con el tiempo.
 */
@Directive({
  selector: '[appBtn]',
  host: { '[class]': 'classes()' }
})
export class BtnDirective {
  readonly appBtn = input<ButtonVariant>('subtle');
  readonly size = input<ButtonSize>('md');

  protected readonly classes = computed(() => {
    const variant = this.appBtn();
    const sizing = variant === 'icon' ? ICON_SIZES[this.size()] : SIZES[this.size()];

    return `${BASE} ${VARIANTS[variant]} ${sizing}`;
  });
}
