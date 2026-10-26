import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Label } from '../../../core/models/board.model';
import { LABEL_CLASSES } from '../../design/palette';

@Component({
  selector: 'app-label-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (compact()) {
      <!-- En la miniatura no cabe el nombre: queda la barra de color, con el texto accesible. -->
      <span
        class="block h-1.5 w-8 rounded-full transition-all duration-200 group-hover/card:w-10"
        [class]="style().bar"
        [attr.title]="label().name"
        [attr.aria-label]="label().name"
      ></span>
    } @else {
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ring-1"
        [class]="style().chip"
      >
        <span class="h-1.5 w-1.5 rounded-full" [class]="style().dot"></span>
        {{ label().name }}
      </span>
    }
  `
})
export class LabelChip {
  readonly label = input.required<Label>();
  readonly compact = input(false);

  protected readonly style = computed(() => LABEL_CLASSES[this.label().color]);
}
