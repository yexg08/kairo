import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, tap } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { BoardList, Card } from '../../core/models/board.model';
import { BOARD_BACKGROUNDS, BoardBackground } from '../../core/models/common.model';
import { BoardsService } from '../../core/services/boards.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/state/workspace-store';
import { AvatarStack } from '../../shared/components/avatar-stack/avatar-stack';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Modal } from '../../shared/components/modal/modal';
import { Spinner } from '../../shared/components/spinner/spinner';
import { BtnDirective } from '../../shared/design/button';
import { BOARD_BACKGROUND_CLASSES } from '../../shared/design/palette';
import { Icon } from '../../shared/icons/icon';
import { ActivityPanel } from './activity-panel/activity-panel';
import { BoardColumn } from './board-column/board-column';
import { BoardFilters } from './board-filters/board-filters';
import { BoardStore } from './board-store';
import { CardDetailDialog } from './card-detail-dialog/card-detail-dialog';

@Component({
  selector: 'app-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [BoardStore],
  imports: [
    CdkDrag,
    CdkDragPlaceholder,
    CdkDropList,
    ReactiveFormsModule,
    RouterLink,
    ActivityPanel,
    AvatarStack,
    BoardColumn,
    BoardFilters,
    CardDetailDialog,
    EmptyState,
    Icon,
    Modal,
    Spinner,
    BtnDirective
  ],
  templateUrl: './board.html'
})
export class Board implements OnDestroy {
  protected readonly store = inject(BoardStore);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly boards = inject(BoardsService);
  private readonly workspaces = inject(WorkspaceStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  private readonly newListInput = viewChild<ElementRef<HTMLInputElement>>('newListInput');

  protected readonly backgrounds = BOARD_BACKGROUNDS;
  protected readonly addingList = signal(false);
  protected readonly showActivity = signal(false);
  protected readonly showSettings = signal(false);
  protected readonly background = signal<BoardBackground>('aurora');

  /** La tarjeta abierta vive en la URL: así se puede compartir el enlace directo. */
  protected readonly openCardId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('card'))),
    { initialValue: null }
  );

  protected readonly settingsForm = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['']
  });

  protected readonly surfaceClass = computed(() => {
    const board = this.store.board();
    return board ? BOARD_BACKGROUND_CLASSES[board.background].surface : '';
  });

  protected readonly presenceLabel = computed(() => {
    const count = this.store.viewers().length;
    return count === 1 ? 'solo tú' : `${count} viéndolo`;
  });

  constructor() {
    // Navegar de un tablero a otro reutiliza el componente; la recarga cuelga del parámetro.
    this.route.paramMap
      .pipe(
        map((params) => params.get('boardId') ?? ''),
        tap((boardId) => {
          if (boardId) this.store.load(boardId);
        }),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.store.teardown();
  }

  // ─────────────────────────── Arrastrar y soltar ───────────────────────────

  protected dropCard(event: CdkDragDrop<BoardList>): void {
    const card = event.item.data as Card;
    const fromListId = event.previousContainer.data.id;
    const toListId = event.container.data.id;

    if (fromListId === toListId && event.previousIndex === event.currentIndex) return;

    // Copia con los arrays clonados: el estado del store es inmutable y no puede mutarse
    // en sitio, o las señales no notarían el cambio.
    const lists = this.store.lists().map((list) => ({ ...list, cards: [...list.cards] }));
    const from = lists.find((list) => list.id === fromListId);
    const to = lists.find((list) => list.id === toListId);

    if (!from || !to) return;

    from.cards.splice(event.previousIndex, 1);
    to.cards.splice(event.currentIndex, 0, { ...card, boardListId: toListId });

    this.store.moveCard(card.id, toListId, event.currentIndex, lists);
  }

  protected dropList(event: CdkDragDrop<BoardList[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    const lists = [...this.store.lists()];
    const [moved] = lists.splice(event.previousIndex, 1);
    lists.splice(event.currentIndex, 0, moved);

    this.store.moveList(moved.id, event.currentIndex, lists);
  }

  // ─────────────────────────── Listas ───────────────────────────

  protected startAddingList(): void {
    this.addingList.set(true);
    queueMicrotask(() => this.newListInput()?.nativeElement.focus());
  }

  protected submitList(): void {
    const input = this.newListInput()?.nativeElement;
    const name = input?.value.trim() ?? '';

    if (!name) {
      this.addingList.set(false);
      return;
    }

    this.store.createList(name);
    if (input) input.value = '';
    input?.focus();
  }

  protected async archiveList(listId: string): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: '¿Archivar la lista?',
      message: 'Sus tarjetas se archivan con ella y dejan de verse en el tablero.',
      confirmLabel: 'Archivar'
    });

    if (confirmed) this.store.archiveList(listId);
  }

  protected async deleteList(listId: string): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: '¿Eliminar la lista?',
      message: 'Se borra con todas sus tarjetas y comentarios. No se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true
    });

    if (confirmed) this.store.deleteList(listId);
  }

  // ─────────────────────────── Tarjeta abierta ───────────────────────────

  protected openCard(cardId: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { card: cardId },
      queryParamsHandling: 'merge'
    });
  }

  protected closeCard(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { card: null },
      queryParamsHandling: 'merge'
    });
  }

  protected onCardRemoved(cardId: string): void {
    this.store.forgetCard(cardId);
    this.closeCard();
  }

  // ─────────────────────────── Ajustes ───────────────────────────

  protected openSettings(): void {
    const board = this.store.board();
    if (!board) return;

    this.settingsForm.setValue({ name: board.name, description: board.description ?? '' });
    this.background.set(board.background);
    this.showSettings.set(true);
  }

  protected thumbClass(background: BoardBackground): string {
    return BOARD_BACKGROUND_CLASSES[background].thumb;
  }

  protected backgroundLabel(background: BoardBackground): string {
    return BOARD_BACKGROUND_CLASSES[background].label;
  }

  protected saveSettings(): void {
    const board = this.store.board();
    if (!board || this.settingsForm.invalid) return;

    const { name, description } = this.settingsForm.getRawValue();

    this.boards
      .update(board.id, { name, description: description || null, background: this.background() })
      .subscribe({
        next: () => {
          this.showSettings.set(false);
          this.toast.success('Tablero actualizado.');
        },
        error: () => this.toast.error('No se pudo guardar el tablero.')
      });
  }

  protected async archiveBoard(): Promise<void> {
    const board = this.store.board();
    if (!board) return;

    const confirmed = await this.confirm.ask({
      title: `¿Archivar ${board.name}?`,
      message: 'Sale de la lista de tableros del espacio, pero no se borra nada.',
      confirmLabel: 'Archivar'
    });

    if (!confirmed) return;

    this.boards.setArchived(board.id, { isArchived: true }).subscribe({
      next: () => {
        this.workspaces.load(true);
        void this.router.navigate(['/app/w', board.workspaceId]);
      },
      error: () => this.toast.error('No se pudo archivar el tablero.')
    });
  }

  protected async deleteBoard(): Promise<void> {
    const board = this.store.board();
    if (!board) return;

    const confirmed = await this.confirm.ask({
      title: `¿Eliminar ${board.name}?`,
      message: 'Se borran sus listas, tarjetas y comentarios. No se puede deshacer.',
      confirmLabel: 'Eliminar tablero',
      danger: true
    });

    if (!confirmed) return;

    this.boards.remove(board.id).subscribe({
      next: () => {
        this.workspaces.load(true);
        this.toast.success('Tablero eliminado.');
        void this.router.navigate(['/app/w', board.workspaceId]);
      },
      error: () => this.toast.error('No se pudo eliminar el tablero.')
    });
  }
}
