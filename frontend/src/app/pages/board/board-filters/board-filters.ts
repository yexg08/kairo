import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Label } from '../../../core/models/board.model';
import { DueFilter } from '../../../core/models/dashboard.model';
import { WorkspaceMember } from '../../../core/models/workspace.model';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { LabelChip } from '../../../shared/components/label-chip/label-chip';
import { BtnDirective } from '../../../shared/design/button';
import { Icon } from '../../../shared/icons/icon';
import { BoardFilters as Filters } from '../board-store';

const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: 'Any', label: 'Cualquiera' },
  { value: 'Overdue', label: 'Vencidas' },
  { value: 'Today', label: 'Hoy' },
  { value: 'ThisWeek', label: 'Esta semana' },
  { value: 'NoDueDate', label: 'Sin fecha' }
];

@Component({
  selector: 'app-board-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar, Icon, LabelChip, BtnDirective],
  host: { '(document:keydown.escape)': 'open.set(false)' },
  template: `
    <div class="relative">
      <button
        type="button"
        [appBtn]="active() ? 'primary' : 'subtle'"
        size="sm"
        [attr.aria-expanded]="open()"
        (click)="open.set(!open())"
      >
        <app-icon name="funnel" [size]="15" />
        Filtros
        @if (activeCount() > 0) {
          <span class="rounded-full bg-white/20 px-1.5 text-[11px]">{{ activeCount() }}</span>
        }
      </button>

      @if (open()) {
        <div class="fixed inset-0 z-40" (click)="open.set(false)" aria-hidden="true"></div>

        <div
          class="animate-pop absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl
                 bg-carbon p-4 shadow-lifted ring-1 ring-graphite"
          role="dialog"
          aria-label="Filtros del tablero"
        >
          <div class="mb-4">
            <label class="mb-1.5 block text-xs uppercase tracking-wider text-ash" for="filter-query">
              Título contiene
            </label>
            <input
              id="filter-query"
              type="text"
              class="h-9 w-full rounded-md bg-obsidian px-3 text-sm text-paper ring-1 ring-graphite
                     placeholder:text-ash focus:outline-none focus:ring-2 focus:ring-iris-500"
              placeholder="Buscar en este tablero…"
              [value]="filters().query"
              (input)="onQuery($event)"
            />
          </div>

          <div class="mb-4">
            <span class="mb-2 block text-xs uppercase tracking-wider text-ash">Etiquetas</span>
            <div class="flex flex-wrap gap-1.5">
              @for (label of labels(); track label.id) {
                <button
                  type="button"
                  class="rounded-full transition-opacity"
                  [class.opacity-35]="!isLabelOn(label.id)"
                  [attr.aria-pressed]="isLabelOn(label.id)"
                  (click)="toggleLabel(label.id)"
                >
                  <app-label-chip [label]="label" />
                </button>
              } @empty {
                <p class="text-xs text-ash">Sin etiquetas en este tablero.</p>
              }
            </div>
          </div>

          <div class="mb-4">
            <span class="mb-2 block text-xs uppercase tracking-wider text-ash">Responsables</span>
            <div class="flex flex-wrap gap-1.5">
              @for (member of members(); track member.userId) {
                <button
                  type="button"
                  class="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-xs ring-1
                         transition-colors"
                  [class]="
                    isAssigneeOn(member.userId)
                      ? 'bg-iris-500/15 text-iris-200 ring-iris-400/30'
                      : 'bg-obsidian text-fog ring-graphite hover:text-paper'
                  "
                  [attr.aria-pressed]="isAssigneeOn(member.userId)"
                  (click)="toggleAssignee(member.userId)"
                >
                  <app-avatar
                    size="xs"
                    [displayName]="member.displayName"
                    [initials]="member.initials"
                    [color]="member.avatarColor"
                  />
                  {{ member.displayName }}
                </button>
              }
            </div>
          </div>

          <div class="mb-4">
            <span class="mb-2 block text-xs uppercase tracking-wider text-ash">Fecha límite</span>
            <div class="flex flex-wrap gap-1.5">
              @for (option of dueOptions; track option.value) {
                <button
                  type="button"
                  class="rounded-full px-2.5 py-1 text-xs ring-1 transition-colors"
                  [class]="
                    filters().due === option.value
                      ? 'bg-iris-500/15 text-iris-200 ring-iris-400/30'
                      : 'bg-obsidian text-fog ring-graphite hover:text-paper'
                  "
                  [attr.aria-pressed]="filters().due === option.value"
                  (click)="setDue(option.value)"
                >
                  {{ option.label }}
                </button>
              }
            </div>
          </div>

          @if (active()) {
            <button type="button" appBtn="ghost" size="sm" class="w-full" (click)="clear()">
              <app-icon name="x-mark" [size]="14" />
              Quitar filtros
            </button>
          }
        </div>
      }
    </div>
  `
})
export class BoardFilters {
  readonly labels = input<Label[]>([]);
  readonly members = input<WorkspaceMember[]>([]);
  readonly filters = input.required<Filters>();

  readonly filtersChange = output<Filters>();

  protected readonly open = signal(false);
  protected readonly dueOptions = DUE_OPTIONS;

  protected readonly activeCount = computed(() => {
    const filters = this.filters();

    return (
      filters.labelIds.length +
      filters.assigneeIds.length +
      (filters.due === 'Any' ? 0 : 1) +
      (filters.query.trim() ? 1 : 0)
    );
  });

  protected readonly active = computed(() => this.activeCount() > 0);

  protected isLabelOn(id: string): boolean {
    return this.filters().labelIds.includes(id);
  }

  protected isAssigneeOn(id: string): boolean {
    return this.filters().assigneeIds.includes(id);
  }

  protected toggleLabel(id: string): void {
    const current = this.filters();
    this.emit({ ...current, labelIds: toggle(current.labelIds, id) });
  }

  protected toggleAssignee(id: string): void {
    const current = this.filters();
    this.emit({ ...current, assigneeIds: toggle(current.assigneeIds, id) });
  }

  protected setDue(due: DueFilter): void {
    // Volver a pulsar el filtro activo lo quita, en vez de obligar a buscar "Cualquiera".
    const current = this.filters();
    this.emit({ ...current, due: current.due === due ? 'Any' : due });
  }

  protected onQuery(event: Event): void {
    this.emit({ ...this.filters(), query: (event.target as HTMLInputElement).value });
  }

  protected clear(): void {
    this.emit({ labelIds: [], assigneeIds: [], due: 'Any', query: '' });
  }

  private emit(filters: Filters): void {
    this.filtersChange.emit(filters);
  }
}

function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}
