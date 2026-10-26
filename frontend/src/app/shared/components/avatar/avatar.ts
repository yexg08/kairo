import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AvatarColor } from '../../../core/models/common.model';
import { AVATAR_CLASSES } from '../../design/palette';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-6 w-6 text-[11px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-11 w-11 text-sm'
};

@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      [class]="classes()"
      [attr.title]="displayName()"
      [attr.aria-label]="displayName()"
      role="img"
    >
      {{ initials() }}
    </span>
  `
})
export class Avatar {
  readonly displayName = input.required<string>();
  readonly color = input<AvatarColor>('indigo');
  readonly size = input<AvatarSize>('md');

  /** Las manda el servidor ya calculadas; si faltan, se sacan del nombre. */
  readonly initialsInput = input<string | undefined>(undefined, { alias: 'initials' });

  protected readonly initials = computed(() => {
    const provided = this.initialsInput();
    if (provided) return provided;

    const parts = this.displayName().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  protected readonly classes = computed(
    () =>
      'inline-flex select-none items-center justify-center rounded-full font-medium uppercase ' +
      `ring-1 ${AVATAR_CLASSES[this.color()]} ${SIZE_CLASSES[this.size()]}`
  );
}
