import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-switch-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="switch"
      class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200"
      [class]="checked() ? 'bg-iris-500' : 'bg-graphite'"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      (click)="toggled.emit(!checked())"
    >
      <span
        class="inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200
               ease-[cubic-bezier(0.16,1,0.3,1)]"
        [class]="checked() ? 'translate-x-[18px]' : 'translate-x-[3px]'"
      ></span>
    </button>
  `
})
export class SwitchToggle {
  readonly checked = input.required<boolean>();
  readonly label = input('');
  readonly disabled = input(false);

  readonly toggled = output<boolean>();
}
