import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../../icons/icon';
import { BtnDirective } from '../../design/button';

export type ModalSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl'
};

@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon, BtnDirective],
  host: {
    '(document:keydown.escape)': 'onEscape()'
  },
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
        <!-- El fondo cierra al pulsar, pero es un div aparte para que el clic dentro del
             panel no burbujee hasta aquí. -->
        <div
          class="fixed inset-0 bg-void/80 backdrop-blur-sm"
          (click)="close.emit()"
          aria-hidden="true"
        ></div>

        <div
          class="animate-pop relative my-auto w-full rounded-xl bg-carbon shadow-lifted ring-1 ring-graphite"
          [class]="sizeClass()"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          cdkTrapFocus
          [cdkTrapFocusAutoCapture]="true"
        >
          @if (title()) {
            <header class="flex items-start gap-3 border-b border-graphite px-5 py-4">
              <div class="min-w-0 flex-1">
                <h2 class="truncate text-base font-medium text-paper">{{ title() }}</h2>
                @if (subtitle()) {
                  <p class="mt-0.5 truncate text-sm text-fog">{{ subtitle() }}</p>
                }
              </div>
              <button type="button" appBtn="icon" size="sm" aria-label="Cerrar" (click)="close.emit()">
                <app-icon name="x-mark" [size]="16" />
              </button>
            </header>
          }

          <div class="px-5 py-4">
            <ng-content />
          </div>

          <ng-content select="[modalFooter]" />
        </div>
      </div>
    }
  `
})
export class Modal {
  readonly open = input(false);
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly size = input<ModalSize>('md');

  readonly close = output<void>();

  protected readonly sizeClass = computed(() => SIZE_CLASSES[this.size()]);

  protected onEscape(): void {
    if (this.open()) this.close.emit();
  }
}
