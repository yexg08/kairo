import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDropList
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { BoardList, Card } from '../../../core/models/board.model';
import { BtnDirective } from '../../../shared/design/button';
import { Icon } from '../../../shared/icons/icon';
import { CardTile } from '../card-tile/card-tile';

@Component({
  selector: 'app-board-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    CdkDropList,
    BtnDirective,
    CardTile,
    Icon
  ],
  host: { class: 'block' },
  template: `
    <section
      class="flex max-h-full w-72 shrink-0 flex-col rounded-xl bg-carbon/85 ring-1 ring-graphite
             backdrop-blur-sm"
      [attr.aria-label]="'Lista ' + list().name"
    >
      <!-- Cabecera: además es el asa de arrastre de la columna, para que agarrar una tarjeta
           no arrastre la lista entera. -->
      <header
        class="flex items-center gap-2 px-3 py-2.5"
        [class.cursor-grab]="canManage()"
        [class.active:cursor-grabbing]="canManage()"
        cdkDragHandle
      >
        @if (renaming()) {
          <input
            #renameInput
            type="text"
            class="h-7 min-w-0 flex-1 rounded bg-obsidian px-2 text-sm text-paper ring-1 ring-iris-500
                   focus:outline-none"
            [value]="list().name"
            (keydown.enter)="commitRename($event)"
            (keydown.escape)="renaming.set(false)"
            (blur)="commitRename($event)"
          />
        } @else {
          <button
            type="button"
            class="min-w-0 flex-1 truncate rounded px-1 py-0.5 text-left text-sm font-medium text-mist
                   transition-colors hover:bg-obsidian hover:text-paper"
            [disabled]="!canManage()"
            (click)="startRename()"
          >
            {{ list().name }}
          </button>
        }

        <span class="shrink-0 rounded-full bg-obsidian px-2 py-0.5 text-[11px] tabular-nums text-ash">
          {{ list().cards.length }}
        </span>

        @if (canManage()) {
          <div class="relative shrink-0">
            <button
              type="button"
              appBtn="icon"
              size="sm"
              [attr.aria-label]="'Opciones de ' + list().name"
              (click)="menuOpen.set(!menuOpen())"
            >
              <app-icon name="ellipsis-horizontal" [size]="16" />
            </button>

            @if (menuOpen()) {
              <div class="fixed inset-0 z-40" (click)="menuOpen.set(false)" aria-hidden="true"></div>
              <div
                class="animate-pop absolute right-0 z-50 mt-1 w-44 rounded-lg bg-obsidian p-1
                       shadow-lifted ring-1 ring-graphite"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  class="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-sm text-fog
                         transition-colors hover:bg-graphite hover:text-paper"
                  (click)="menuOpen.set(false); startRename()"
                >
                  <app-icon name="pencil-square" [size]="15" />
                  Renombrar
                </button>
                <button
                  type="button"
                  role="menuitem"
                  class="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-sm text-fog
                         transition-colors hover:bg-graphite hover:text-paper"
                  (click)="menuOpen.set(false); archived.emit(list().id)"
                >
                  <app-icon name="archive-box" [size]="15" />
                  Archivar lista
                </button>
                <button
                  type="button"
                  role="menuitem"
                  class="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-sm text-rose-300
                         transition-colors hover:bg-signal-danger/10"
                  (click)="menuOpen.set(false); deleted.emit(list().id)"
                >
                  <app-icon name="trash" [size]="15" />
                  Eliminar lista
                </button>
              </div>
            }
          </div>
        }
      </header>

      <!-- Zona de soltar tarjetas. Conectada con las demás columnas por id, no con
           cdkDropListGroup: si no, la lista horizontal de columnas también entraría en el
           grupo y las tarjetas podrían soltarse sobre ella. -->
      <div
        class="scrollbar-slim min-h-3 flex-1 overflow-y-auto px-2 pb-2"
        cdkDropList
        [id]="dropListId()"
        [cdkDropListData]="list()"
        [cdkDropListConnectedTo]="connectedTo()"
        (cdkDropListDropped)="cardDropped.emit($event)"
      >
        <div class="space-y-2">
          @for (card of list().cards; track card.id) {
            <!-- Con filtros puestos, los índices que ve el usuario no son los reales de la
                 lista, así que arrastrar mentiría sobre dónde cae la tarjeta: se desactiva. -->
            <app-card-tile
              cdkDrag
              [cdkDragData]="card"
              [cdkDragDisabled]="filtered()"
              [card]="card"
              (opened)="cardOpened.emit($event)"
            >
              <!-- Hueco del mismo tamaño que la tarjeta, para que el resto no baile al arrastrar. -->
              <div
                *cdkDragPlaceholder
                class="h-16 rounded-lg border border-dashed border-iris-500/40 bg-iris-500/5"
              ></div>
            </app-card-tile>
          } @empty {
            @if (!adding()) {
              <p class="px-1 py-3 text-center text-xs text-ash">
                {{ emptyMessage() }}
              </p>
            }
          }
        </div>

        @if (adding()) {
          <div class="mt-2">
            <textarea
              #newCardInput
              rows="2"
              class="w-full resize-none rounded-lg bg-obsidian p-2.5 text-[13px] text-paper ring-1
                     ring-iris-500 placeholder:text-ash focus:outline-none"
              placeholder="Título de la tarjeta…"
              (keydown.enter)="submitNewCard($event)"
              (keydown.escape)="adding.set(false)"
            ></textarea>
            <div class="mt-1.5 flex items-center gap-2">
              <button type="button" appBtn="primary" size="sm" (click)="submitNewCard()">
                Añadir
              </button>
              <button type="button" appBtn="ghost" size="sm" (click)="adding.set(false)">
                Cancelar
              </button>
              <span class="ml-auto text-[11px] text-ash">Enter para guardar</span>
            </div>
          </div>
        }
      </div>

      <footer class="p-2 pt-0">
        @if (!adding()) {
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ash
                   transition-colors hover:bg-obsidian hover:text-mist"
            (click)="startAdding()"
          >
            <app-icon name="plus" [size]="15" />
            Añadir tarjeta
          </button>
        }
      </footer>
    </section>
  `
})
export class BoardColumn {
  readonly list = input.required<BoardList>();
  readonly canManage = input(true);
  readonly connectedTo = input<string[]>([]);
  readonly filtered = input(false);

  readonly cardDropped = output<CdkDragDrop<BoardList>>();
  readonly cardOpened = output<string>();
  readonly cardCreated = output<{ listId: string; title: string }>();
  readonly renamed = output<{ listId: string; name: string }>();
  readonly archived = output<string>();
  readonly deleted = output<string>();

  private readonly newCardInput = viewChild<ElementRef<HTMLTextAreaElement>>('newCardInput');
  private readonly renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput');

  protected readonly adding = signal(false);
  protected readonly renaming = signal(false);
  protected readonly menuOpen = signal(false);

  protected readonly dropListId = computed(() => `cards-${this.list().id}`);

  protected readonly emptyMessage = computed(() =>
    this.filtered() ? 'Nada que coincida con el filtro' : 'Suelta una tarjeta aquí'
  );

  protected startAdding(): void {
    this.adding.set(true);
    // El foco se pide tras el ciclo de render, cuando el textarea ya existe en el DOM.
    queueMicrotask(() => this.newCardInput()?.nativeElement.focus());
  }

  protected startRename(): void {
    if (!this.canManage()) return;

    this.renaming.set(true);
    queueMicrotask(() => this.renameInput()?.nativeElement.select());
  }

  protected submitNewCard(event?: Event): void {
    event?.preventDefault();

    const input = this.newCardInput()?.nativeElement;
    const title = input?.value.trim() ?? '';

    if (!title) {
      this.adding.set(false);
      return;
    }

    this.cardCreated.emit({ listId: this.list().id, title });

    // Se deja abierto para encadenar varias tarjetas seguidas, que es como se usa de verdad.
    if (input) input.value = '';
    input?.focus();
  }

  protected commitRename(event: Event): void {
    if (!this.renaming()) return;

    const name = (event.target as HTMLInputElement).value.trim();
    this.renaming.set(false);

    if (name && name !== this.list().name) {
      this.renamed.emit({ listId: this.list().id, name });
    }
  }
}
