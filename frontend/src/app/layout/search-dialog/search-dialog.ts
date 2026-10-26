import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, debounceTime, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CardSearchResult } from '../../core/models/dashboard.model';
import { DashboardService } from '../../core/services/dashboard.service';
import { dueState, DUE_STATE_CLASSES, formatDueDate } from '../../core/utils/dates';
import { AvatarStack } from '../../shared/components/avatar-stack/avatar-stack';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LabelChip } from '../../shared/components/label-chip/label-chip';
import { Modal } from '../../shared/components/modal/modal';
import { Spinner } from '../../shared/components/spinner/spinner';
import { Icon } from '../../shared/icons/icon';

const MIN_QUERY_LENGTH = 2;

@Component({
  selector: 'app-search-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarStack, EmptyState, Icon, LabelChip, Modal, Spinner],
  template: `
    <app-modal size="lg" [open]="open()" (close)="close.emit()">
      <div class="flex items-center gap-3 border-b border-graphite pb-3">
        <app-icon name="magnifying-glass" [size]="18" class="text-ash" />
        <input
          #searchInput
          type="text"
          class="h-8 flex-1 bg-transparent text-base text-paper placeholder:text-ash focus:outline-none"
          placeholder="Buscar tarjetas en todos tus espacios…"
          [value]="query()"
          (input)="onInput($event)"
        />
        @if (loading()) {
          <app-spinner [size]="16" label="Buscando" />
        }
        <kbd class="hidden rounded bg-obsidian px-1.5 py-0.5 text-[11px] text-ash sm:block">Esc</kbd>
      </div>

      <div class="scrollbar-slim -mx-1 mt-2 max-h-[55vh] overflow-y-auto px-1">
        @if (query().length < minLength) {
          <app-empty-state
            icon="magnifying-glass"
            title="Busca en tus tarjetas"
            description="Escribe al menos dos letras. Busca en títulos y descripciones de todos los espacios a los que perteneces."
          />
        } @else if (!loading() && results().length === 0) {
          <app-empty-state
            icon="magnifying-glass"
            title="Sin resultados"
            [description]="'Nada coincide con «' + query() + '».'"
          />
        } @else {
          <ul class="divide-y divide-graphite">
            @for (card of results(); track card.id) {
              <li>
                <button
                  type="button"
                  class="w-full rounded-md px-2 py-3 text-left transition-colors hover:bg-obsidian"
                  (click)="openCard(card)"
                >
                  <div class="flex items-start gap-3">
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm text-paper">{{ card.title }}</p>
                      <p class="mt-0.5 truncate text-xs text-ash">
                        {{ card.workspaceName }} · {{ card.boardName }} · {{ card.listName }}
                      </p>

                      @if (card.labels.length > 0) {
                        <div class="mt-2 flex flex-wrap gap-1.5">
                          @for (label of card.labels; track label.id) {
                            <app-label-chip [label]="label" />
                          }
                        </div>
                      }
                    </div>

                    <div class="flex shrink-0 items-center gap-2">
                      @if (card.dueDate) {
                        <span
                          class="rounded-full px-2 py-0.5 text-[11px] ring-1"
                          [class]="dueClass(card)"
                        >
                          {{ due(card.dueDate) }}
                        </span>
                      }
                      @if (card.assignees.length > 0) {
                        <app-avatar-stack [users]="card.assignees" [max]="2" />
                      }
                    </div>
                  </div>
                </button>
              </li>
            }
          </ul>
        }
      </div>
    </app-modal>
  `
})
export class SearchDialog {
  private readonly dashboard = inject(DashboardService);
  private readonly router = inject(Router);

  readonly open = input(false);
  readonly close = output<void>();

  protected readonly minLength = MIN_QUERY_LENGTH;
  protected readonly query = signal('');
  protected readonly results = signal<CardSearchResult[]>([]);
  protected readonly loading = signal(false);

  private readonly queryChanges = new Subject<string>();

  constructor() {
    // Debounce para no disparar una consulta por tecla; switchMap descarta las respuestas
    // de búsquedas ya obsoletas, que es lo que provoca resultados "que parpadean".
    this.queryChanges
      .pipe(
        debounceTime(220),
        switchMap((query) => this.dashboard.searchCards({ query, take: 25 })),
        takeUntilDestroyed()
      )
      .subscribe({
        next: (results) => {
          this.results.set(results);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });

    effect(() => {
      if (!this.open()) {
        this.query.set('');
        this.results.set([]);
      }
    });
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);

    if (value.trim().length < MIN_QUERY_LENGTH) {
      this.results.set([]);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.queryChanges.next(value.trim());
  }

  protected due(iso: string): string {
    return formatDueDate(iso);
  }

  protected dueClass(card: CardSearchResult): string {
    return DUE_STATE_CLASSES[dueState(card.dueDate, card.isCompleted)];
  }

  protected openCard(card: CardSearchResult): void {
    this.close.emit();
    void this.router.navigate(['/app/b', card.boardId], { queryParams: { card: card.id } });
  }
}
