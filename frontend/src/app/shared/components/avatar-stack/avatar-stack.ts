import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UserSummary } from '../../../core/models/common.model';
import { Avatar, AvatarSize } from '../avatar/avatar';

@Component({
  selector: 'app-avatar-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar],
  template: `
    <div class="flex items-center" [class.-space-x-1.5]="overlap()">
      @for (user of visible(); track user.id) {
        <app-avatar
          class="rounded-full ring-2 ring-carbon"
          [displayName]="user.displayName"
          [initials]="user.initials"
          [color]="user.avatarColor"
          [size]="size()"
        />
      }
      @if (hidden() > 0) {
        <span
          class="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-obsidian px-1
                 text-[11px] text-fog ring-2 ring-carbon"
          [attr.title]="hiddenNames()"
        >
          +{{ hidden() }}
        </span>
      }
    </div>
  `
})
export class AvatarStack {
  readonly users = input.required<UserSummary[]>();
  readonly max = input(3);
  readonly size = input<AvatarSize>('sm');
  readonly overlap = input(true);

  protected readonly visible = computed(() => this.users().slice(0, this.max()));
  protected readonly hidden = computed(() => Math.max(0, this.users().length - this.max()));

  /** Los que no caben siguen siendo consultables por el tooltip del contador. */
  protected readonly hiddenNames = computed(() =>
    this.users()
      .slice(this.max())
      .map((user) => user.displayName)
      .join(', ')
  );
}
