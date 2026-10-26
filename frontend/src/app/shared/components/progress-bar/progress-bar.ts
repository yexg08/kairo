import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="h-1.5 w-full overflow-hidden rounded-full bg-obsidian"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuenow]="percent()"
      [attr.aria-label]="'Progreso: ' + done() + ' de ' + total()"
    >
      <!-- Al completarse cambia a verde: el color remata la tarea, no solo el ancho. -->
      <div
        class="h-full rounded-full transition-[width,background-color] duration-300 ease-out"
        [class]="complete() ? 'bg-signal-success' : 'bg-iris-500'"
        [style.width.%]="percent()"
      ></div>
    </div>
  `
})
export class ProgressBar {
  readonly done = input.required<number>();
  readonly total = input.required<number>();

  protected readonly percent = computed(() => {
    const total = this.total();
    return total === 0 ? 0 : Math.round((this.done() / total) * 100);
  });

  protected readonly complete = computed(() => this.total() > 0 && this.done() === this.total());
}
