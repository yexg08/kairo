import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../../icons/icon';
import { IconName } from '../../icons/heroicons';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span
        class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-obsidian text-fog
               ring-1 ring-graphite"
      >
        <app-icon [name]="icon()" [size]="22" />
      </span>
      <h3 class="text-sm font-medium text-mist">{{ title() }}</h3>
      @if (description()) {
        <p class="mt-1 max-w-sm text-sm text-ash">{{ description() }}</p>
      }
      <div class="mt-5 empty:hidden">
        <ng-content />
      </div>
    </div>
  `
})
export class EmptyState {
  readonly icon = input.required<IconName>();
  readonly title = input.required<string>();
  readonly description = input('');
}
