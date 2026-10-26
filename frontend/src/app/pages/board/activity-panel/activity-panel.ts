import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Activity, ActivityType } from '../../../core/models/activity.model';
import { relativeTime } from '../../../core/utils/dates';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { BtnDirective } from '../../../shared/design/button';
import { Icon } from '../../../shared/icons/icon';
import { IconName } from '../../../shared/icons/heroicons';

const TYPE_ICON: Record<ActivityType, IconName> = {
  BoardCreated: 'squares-plus',
  BoardRenamed: 'pencil-square',
  ListCreated: 'view-columns',
  ListRenamed: 'pencil-square',
  ListMoved: 'arrows-right-left',
  ListArchived: 'archive-box',
  CardCreated: 'plus',
  CardRenamed: 'pencil-square',
  CardMoved: 'arrows-right-left',
  CardDescriptionUpdated: 'pencil-square',
  CardArchived: 'archive-box',
  CardDueDateSet: 'calendar-days',
  CardDueDateCleared: 'calendar-days',
  CardCompleted: 'check-circle',
  CardReopened: 'arrow-path',
  CardAssigned: 'user-plus',
  CardUnassigned: 'user-circle',
  LabelAdded: 'tag',
  LabelRemoved: 'tag',
  ChecklistItemAdded: 'list-bullet',
  ChecklistItemCompleted: 'check',
  ChecklistItemReopened: 'arrow-path',
  ChecklistItemRemoved: 'trash',
  CommentAdded: 'chat-bubble-left-ellipsis',
  MemberJoined: 'user-plus',
  MemberLeft: 'arrow-right-start-on-rectangle',
  MemberRoleChanged: 'shield-check'
};

@Component({
  selector: 'app-activity-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar, EmptyState, Icon, BtnDirective],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-40 bg-void/60 backdrop-blur-sm lg:hidden" (click)="close.emit()"></div>

      <aside
        class="animate-slide-in fixed inset-y-0 right-0 z-50 flex w-[min(22rem,100vw)] flex-col
               border-l border-graphite bg-carbon"
        aria-label="Actividad del tablero"
      >
        <header class="flex items-center justify-between border-b border-graphite px-4 py-3">
          <div>
            <h2 class="text-sm font-medium text-paper">Actividad</h2>
            <p class="text-xs text-ash">Quién hizo qué, en orden</p>
          </div>
          <button type="button" appBtn="icon" size="sm" aria-label="Cerrar" (click)="close.emit()">
            <app-icon name="x-mark" [size]="16" />
          </button>
        </header>

        <div class="scrollbar-slim flex-1 overflow-y-auto">
          @if (entries().length === 0) {
            <app-empty-state
              icon="bolt"
              title="Todavía no hay movimiento"
              description="En cuanto alguien mueva o cree algo, aparecerá aquí al instante."
            />
          } @else {
            <ul class="p-3">
              @for (entry of entries(); track entry.id) {
                <li class="relative flex gap-3 pb-4 pl-1">
                  <!-- Línea de tiempo: se corta en la última entrada para no dejarla colgando. -->
                  @if (!$last) {
                    <span
                      class="absolute bottom-0 left-[15px] top-8 w-px bg-graphite"
                      aria-hidden="true"
                    ></span>
                  }

                  <span
                    class="relative z-10 mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center
                           rounded-full bg-obsidian text-ash ring-1 ring-graphite"
                  >
                    <app-icon [name]="icon(entry.type)" [size]="13" />
                  </span>

                  <div class="min-w-0 flex-1">
                    <p class="text-sm leading-snug text-fog">
                      <span class="text-mist">{{ entry.actor.displayName }}</span>
                      {{ text(entry) }}
                    </p>
                    <div class="mt-1 flex items-center gap-2">
                      <app-avatar
                        size="xs"
                        [displayName]="entry.actor.displayName"
                        [initials]="entry.actor.initials"
                        [color]="entry.actor.avatarColor"
                      />
                      <span class="text-xs text-ash">{{ time(entry.createdAt) }}</span>
                    </div>
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      </aside>
    }
  `
})
export class ActivityPanel {
  readonly open = input(false);
  readonly entries = input<Activity[]>([]);

  readonly close = output<void>();

  protected icon(type: ActivityType): IconName {
    return TYPE_ICON[type];
  }

  protected time(iso: string): string {
    return relativeTime(iso);
  }

  /**
   * El texto se arma aquí y no en el servidor: la API guarda el hecho (tipo + nombres) y la
   * interfaz decide cómo contarlo, que es lo que permite traducirlo o reescribirlo sin migrar
   * lo que ya está en la base.
   */
  protected text(entry: Activity): string {
    const card = entry.cardTitle ? `«${entry.cardTitle}»` : 'una tarjeta';
    const detail = entry.detail ?? '';

    switch (entry.type) {
      case 'BoardCreated':
        return `creó el tablero ${detail}`;
      case 'BoardRenamed':
        return `renombró el tablero a ${detail}`;
      case 'ListCreated':
        return `creó la lista ${entry.toListName}`;
      case 'ListRenamed':
        return `renombró ${entry.fromListName} a ${entry.toListName}`;
      case 'ListMoved':
        return `movió la lista ${entry.toListName}`;
      case 'ListArchived':
        return `archivó la lista ${entry.toListName}`;
      case 'CardCreated':
        return `creó ${card} en ${entry.toListName}`;
      case 'CardRenamed':
        return `renombró ${detail} a ${entry.cardTitle}`;
      case 'CardMoved':
        return `movió ${card} de ${entry.fromListName} a ${entry.toListName}`;
      case 'CardDescriptionUpdated':
        return `actualizó la descripción de ${card}`;
      case 'CardArchived':
        return `archivó ${card}`;
      case 'CardDueDateSet':
        return `puso fecha límite a ${card}`;
      case 'CardDueDateCleared':
        return `quitó la fecha límite de ${card}`;
      case 'CardCompleted':
        return `marcó ${card} como cumplida`;
      case 'CardReopened':
        return `reabrió ${card}`;
      case 'CardAssigned':
        return `asignó a ${detail} en ${card}`;
      case 'CardUnassigned':
        return `quitó a ${detail} de ${card}`;
      case 'LabelAdded':
        return `etiquetó ${card} como ${detail}`;
      case 'LabelRemoved':
        return `quitó la etiqueta ${detail} de ${card}`;
      case 'ChecklistItemAdded':
        return `añadió «${detail}» a ${card}`;
      case 'ChecklistItemCompleted':
        return `completó «${detail}» en ${card}`;
      case 'ChecklistItemReopened':
        return `reabrió «${detail}» en ${card}`;
      case 'ChecklistItemRemoved':
        return `eliminó «${detail}» de ${card}`;
      case 'CommentAdded':
        return `comentó en ${card}: ${detail}`;
      case 'MemberJoined':
        return 'se unió al espacio';
      case 'MemberLeft':
        return 'salió del espacio';
      case 'MemberRoleChanged':
        return `cambió el rol de ${detail}`;
    }
  }
}
