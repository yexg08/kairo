import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Card } from '../../../core/models/board.model';
import { LABEL_CLASSES } from '../../../shared/design/palette';
import { DUE_STATE_CLASSES, dueState, formatDueDate } from '../../../core/utils/dates';
import { AvatarStack } from '../../../shared/components/avatar-stack/avatar-stack';
import { LabelChip } from '../../../shared/components/label-chip/label-chip';
import { ProgressBar } from '../../../shared/components/progress-bar/progress-bar';
import { Icon } from '../../../shared/icons/icon';

@Component({
  selector: 'app-card-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarStack, Icon, LabelChip, ProgressBar],
  template: `
    <article
      class="group/card cursor-pointer overflow-hidden rounded-lg bg-carbon ring-1 ring-graphite
             transition-[box-shadow,ring-color,transform] duration-150 hover:ring-smoke
             hover:shadow-[0_6px_20px_-12px_rgba(0,0,0,0.9)]"
      [attr.aria-label]="card().title"
      (click)="opened.emit(card().id)"
      (keydown.enter)="opened.emit(card().id)"
      tabindex="0"
      role="button"
    >
      @if (card().coverColor; as cover) {
        <div class="h-1.5 w-full" [class]="coverClass(cover)"></div>
      }

      <div class="p-3">
        @if (card().labels.length > 0) {
          <div class="mb-2 flex flex-wrap gap-1">
            @for (label of card().labels; track label.id) {
              <app-label-chip [label]="label" [compact]="true" />
            }
          </div>
        }

        <p
          class="text-[13px] leading-snug text-mist transition-colors group-hover/card:text-paper"
          [class.line-through]="card().isCompleted"
          [class.text-ash]="card().isCompleted"
        >
          {{ card().title }}
        </p>

        @if (card().checklistTotal > 0) {
          <div class="mt-2.5 flex items-center gap-2">
            <app-progress-bar
              class="flex-1"
              [done]="card().checklistDone"
              [total]="card().checklistTotal"
            />
            <span class="shrink-0 text-[11px] tabular-nums text-ash">
              {{ card().checklistDone }}/{{ card().checklistTotal }}
            </span>
          </div>
        }

        @if (hasFooter()) {
          <div class="mt-2.5 flex items-center gap-2.5">
            @if (card().dueDate; as due) {
              <span
                class="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] ring-1"
                [class]="dueClass()"
              >
                <app-icon name="clock" [size]="11" />
                {{ dueLabel(due) }}
              </span>
            }

            @if (card().hasDescription) {
              <span class="text-ash" title="Tiene descripción">
                <app-icon name="list-bullet" [size]="13" />
              </span>
            }

            @if (card().commentCount > 0) {
              <span class="flex items-center gap-1 text-[11px] text-ash">
                <app-icon name="chat-bubble-left-ellipsis" [size]="13" />
                {{ card().commentCount }}
              </span>
            }

            @if (card().assignees.length > 0) {
              <div class="ml-auto">
                <app-avatar-stack [users]="card().assignees" [max]="3" size="xs" />
              </div>
            }
          </div>
        }
      </div>
    </article>
  `
})
export class CardTile {
  readonly card = input.required<Card>();
  readonly opened = output<string>();

  protected readonly hasFooter = computed(() => {
    const card = this.card();
    return (
      card.dueDate !== null ||
      card.hasDescription ||
      card.commentCount > 0 ||
      card.assignees.length > 0
    );
  });

  protected readonly dueClass = computed(
    () => DUE_STATE_CLASSES[dueState(this.card().dueDate, this.card().isCompleted)]
  );

  protected coverClass(cover: string): string {
    return LABEL_CLASSES[cover as keyof typeof LABEL_CLASSES]?.bar ?? 'bg-slate-500/70';
  }

  protected dueLabel(iso: string): string {
    return formatDueDate(iso);
  }
}
