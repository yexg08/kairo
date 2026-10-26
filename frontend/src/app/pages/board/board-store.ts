import { Injectable, computed, inject, signal } from '@angular/core';
import { Activity } from '../../core/models/activity.model';
import { BoardDetail, BoardList, Card, Label } from '../../core/models/board.model';
import { UserSummary } from '../../core/models/common.model';
import { DueFilter } from '../../core/models/dashboard.model';
import { PositionUpdate } from '../../core/models/realtime.model';
import { WorkspaceMember } from '../../core/models/workspace.model';
import { BoardsService } from '../../core/services/boards.service';
import { CardsService } from '../../core/services/cards.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { ToastService } from '../../core/services/toast.service';
import { dueState } from '../../core/utils/dates';

export interface BoardFilters {
  labelIds: string[];
  assigneeIds: string[];
  due: DueFilter;
  query: string;
}

const EMPTY_FILTERS: BoardFilters = { labelIds: [], assigneeIds: [], due: 'Any', query: '' };

/**
 * Estado del tablero abierto. Se provee a nivel del componente Board (no en root) para que
 * al salir se destruya con él y no quede escuchando eventos de un tablero que ya nadie ve.
 *
 * Regla de oro de este archivo: los cambios se aplican de forma **idempotente por id**. Un
 * mismo movimiento llega dos veces —por la respuesta HTTP y por el eco de SignalR— y el
 * resultado tiene que ser el mismo se apliquen en el orden que se apliquen.
 */
@Injectable()
export class BoardStore {
  private readonly boards = inject(BoardsService);
  private readonly cards = inject(CardsService);
  private readonly realtime = inject(RealtimeService);
  private readonly toast = inject(ToastService);

  private readonly unsubscribers: (() => void)[] = [];
  private boardId = '';

  private readonly boardData = signal<BoardDetail | null>(null);
  private readonly listData = signal<BoardList[]>([]);
  private readonly labelData = signal<Label[]>([]);
  private readonly memberData = signal<WorkspaceMember[]>([]);
  private readonly viewerData = signal<UserSummary[]>([]);
  private readonly activityData = signal<Activity[]>([]);
  private readonly filterData = signal<BoardFilters>(EMPTY_FILTERS);
  private readonly loadingState = signal(true);
  private readonly failed = signal(false);

  readonly board = this.boardData.asReadonly();
  readonly lists = this.listData.asReadonly();
  readonly labels = this.labelData.asReadonly();
  readonly members = this.memberData.asReadonly();
  readonly viewers = this.viewerData.asReadonly();
  readonly activity = this.activityData.asReadonly();
  readonly filters = this.filterData.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly notFound = this.failed.asReadonly();

  readonly canManage = computed(() => this.boardData()?.myRole !== 'Member');

  readonly memberSummaries = computed<UserSummary[]>(() =>
    this.memberData().map((member) => ({
      id: member.userId,
      displayName: member.displayName,
      email: member.email,
      avatarColor: member.avatarColor,
      initials: member.initials
    }))
  );

  readonly filtersActive = computed(() => {
    const filters = this.filterData();
    return (
      filters.labelIds.length > 0 ||
      filters.assigneeIds.length > 0 ||
      filters.due !== 'Any' ||
      filters.query.trim().length > 0
    );
  });

  /** Las listas siempre están; lo que se filtra son las tarjetas de dentro. */
  readonly visibleLists = computed<BoardList[]>(() => {
    const filters = this.filterData();
    if (!this.filtersActive()) return this.listData();

    return this.listData().map((list) => ({
      ...list,
      cards: list.cards.filter((card) => this.matchesFilters(card, filters))
    }));
  });

  readonly visibleCardCount = computed(() =>
    this.visibleLists().reduce((total, list) => total + list.cards.length, 0)
  );

  readonly totalCardCount = computed(() =>
    this.listData().reduce((total, list) => total + list.cards.length, 0)
  );

  /** Ids de las zonas de soltar de tarjetas: el CDK las necesita para conectarlas entre sí. */
  readonly dropListIds = computed(() => this.listData().map((list) => `cards-${list.id}`));

  // ─────────────────────────── Carga ───────────────────────────

  load(boardId: string): void {
    this.teardown();

    this.boardId = boardId;
    this.loadingState.set(true);
    this.failed.set(false);

    this.boards.getById(boardId).subscribe({
      next: (board) => {
        this.boardData.set(board);
        this.listData.set([...board.lists].sort(byPosition));
        this.labelData.set(board.labels);
        this.memberData.set(board.members);
        this.loadingState.set(false);

        this.loadActivity();
        this.listen();
        void this.realtime.joinBoard(boardId);
      },
      error: () => {
        this.failed.set(true);
        this.loadingState.set(false);
      }
    });
  }

  loadActivity(): void {
    this.boards.getActivity(this.boardId, 1, 40).subscribe({
      next: (result) => this.activityData.set(result.items)
    });
  }

  teardown(): void {
    for (const unsubscribe of this.unsubscribers.splice(0)) unsubscribe();
    if (this.boardId) void this.realtime.leaveBoard(this.boardId);
  }

  // ─────────────────────────── Filtros ───────────────────────────

  setFilters(filters: BoardFilters): void {
    this.filterData.set(filters);
  }

  clearFilters(): void {
    this.filterData.set(EMPTY_FILTERS);
  }

  // ─────────────────────────── Mutaciones ───────────────────────────

  createList(name: string): void {
    this.boards.createList(this.boardId, { name }).subscribe({
      next: (list) => this.upsertList({ ...list, cards: list.cards ?? [] }),
      error: () => this.toast.error('No se pudo crear la lista.')
    });
  }

  renameList(listId: string, name: string): void {
    const previous = this.listData().find((list) => list.id === listId)?.name;
    this.patchList(listId, (list) => ({ ...list, name }));

    this.boards.renameList(listId, { name }).subscribe({
      error: () => {
        if (previous !== undefined) this.patchList(listId, (list) => ({ ...list, name: previous }));
        this.toast.error('No se pudo renombrar la lista.');
      }
    });
  }

  archiveList(listId: string): void {
    this.removeList(listId);

    this.boards.setListArchived(listId, { isArchived: true }).subscribe({
      error: () => {
        this.toast.error('No se pudo archivar la lista.');
        this.load(this.boardId);
      }
    });
  }

  deleteList(listId: string): void {
    this.removeList(listId);

    this.boards.removeList(listId).subscribe({
      error: () => {
        this.toast.error('No se pudo eliminar la lista.');
        this.load(this.boardId);
      }
    });
  }

  /**
   * Mueve una lista. El array ya viene reordenado por el CDK, así que aquí solo se manda el
   * índice al servidor; si falla, se recarga porque reconstruir el orden previo a mano es
   * más frágil que pedirlo de nuevo.
   */
  moveList(listId: string, newIndex: number, reordered: BoardList[]): void {
    this.listData.set(reordered);

    this.boards.moveList(listId, { newIndex }).subscribe({
      error: () => {
        this.toast.error('No se pudo mover la lista.');
        this.load(this.boardId);
      }
    });
  }

  createCard(listId: string, title: string, atTop = false): void {
    this.cards.create({ boardListId: listId, title, atTop }).subscribe({
      next: (card) => this.upsertCard(card),
      error: () => this.toast.error('No se pudo crear la tarjeta.')
    });
  }

  moveCard(cardId: string, targetListId: string, newIndex: number, optimistic: BoardList[]): void {
    this.listData.set(optimistic);

    this.cards.move(cardId, { targetListId, newIndex }).subscribe({
      next: (card) => this.upsertCard(card),
      error: () => {
        this.toast.error('No se pudo mover la tarjeta.');
        this.load(this.boardId);
      }
    });
  }

  archiveCard(cardId: string): void {
    this.removeCard(cardId);

    this.cards.setArchived(cardId, { isArchived: true }).subscribe({
      error: () => {
        this.toast.error('No se pudo archivar la tarjeta.');
        this.load(this.boardId);
      }
    });
  }

  deleteCard(cardId: string): void {
    this.removeCard(cardId);

    this.cards.remove(cardId).subscribe({
      error: () => {
        this.toast.error('No se pudo eliminar la tarjeta.');
        this.load(this.boardId);
      }
    });
  }

  applyCard(card: Card): void {
    this.upsertCard(card);
  }

  /** Saca la tarjeta del tablero sin llamar a la API: ya la archivó o borró quien la abrió. */
  forgetCard(cardId: string): void {
    this.removeCard(cardId);
  }

  setLabels(labels: Label[]): void {
    this.labelData.set(labels);
  }

  // ─────────────────────────── Tiempo real ───────────────────────────

  private listen(): void {
    const on = this.realtime.on.bind(this.realtime);

    this.unsubscribers.push(
      on('CardCreated', (card) => this.upsertCard(card)),
      on('CardUpdated', (card) => this.upsertCard(card)),
      on('CardArchived', (event) => this.removeCard(event.cardId)),

      on('CardMoved', (event) => {
        this.upsertCard(event.card);
        this.applyCardPositions(event.toListId, event.positions);
      }),

      on('ListCreated', (list) => this.upsertList({ ...list, cards: list.cards ?? [] })),
      on('ListRenamed', (event) =>
        this.patchList(event.listId, (list) => ({ ...list, name: event.name }))
      ),
      on('ListArchived', (event) => this.removeList(event.listId)),
      on('ListMoved', (event) => this.applyListPositions(event.positions)),

      on('BoardInfoChanged', (event) => {
        this.boardData.update((board) =>
          board
            ? { ...board, name: event.name, description: event.description, background: event.background }
            : board
        );
      }),

      on('BoardLabelsChanged', (event) => this.labelData.set(event.labels)),

      on('ChecklistChanged', (event) => {
        this.patchCard(event.cardId, (card) => ({
          ...card,
          checklistTotal: event.total,
          checklistDone: event.done
        }));
      }),

      on('ActivityAdded', (entry) => {
        this.activityData.update((list) => [entry, ...list].slice(0, 60));
      }),

      on('PresenceChanged', (event) => this.viewerData.set(event.viewers))
    );
  }

  // ─────────────────────────── Helpers de estado ───────────────────────────

  private matchesFilters(card: Card, filters: BoardFilters): boolean {
    if (filters.labelIds.length > 0) {
      const cardLabels = new Set(card.labels.map((label) => label.id));
      if (!filters.labelIds.some((id) => cardLabels.has(id))) return false;
    }

    if (filters.assigneeIds.length > 0) {
      const cardAssignees = new Set(card.assignees.map((user) => user.id));
      if (!filters.assigneeIds.some((id) => cardAssignees.has(id))) return false;
    }

    if (filters.due !== 'Any') {
      const state = dueState(card.dueDate, card.isCompleted);

      const matches =
        (filters.due === 'Overdue' && state === 'overdue') ||
        (filters.due === 'Today' && (state === 'today' || state === 'overdue')) ||
        (filters.due === 'ThisWeek' && ['overdue', 'today', 'soon'].includes(state)) ||
        (filters.due === 'NoDueDate' && state === 'none');

      if (!matches) return false;
    }

    const query = filters.query.trim().toLowerCase();
    if (query && !card.title.toLowerCase().includes(query)) return false;

    return true;
  }

  /** Quita la tarjeta de donde estuviera y la coloca en su lista actual, ordenada. */
  private upsertCard(card: Card): void {
    this.listData.update((lists) =>
      lists.map((list) => {
        const withoutCard = list.cards.filter((item) => item.id !== card.id);

        if (list.id !== card.boardListId) {
          return withoutCard.length === list.cards.length ? list : { ...list, cards: withoutCard };
        }

        return { ...list, cards: [...withoutCard, card].sort(byPosition) };
      })
    );
  }

  private patchCard(cardId: string, patch: (card: Card) => Card): void {
    this.listData.update((lists) =>
      lists.map((list) => ({
        ...list,
        cards: list.cards.map((card) => (card.id === cardId ? patch(card) : card))
      }))
    );
  }

  private removeCard(cardId: string): void {
    this.listData.update((lists) =>
      lists.map((list) => ({ ...list, cards: list.cards.filter((card) => card.id !== cardId) }))
    );
  }

  private applyCardPositions(listId: string, positions: PositionUpdate[]): void {
    const byId = new Map(positions.map((update) => [update.id, update.position]));

    this.listData.update((lists) =>
      lists.map((list) => {
        if (list.id !== listId) return list;

        const cards = list.cards.map((card) =>
          byId.has(card.id) ? { ...card, position: byId.get(card.id)! } : card
        );

        return { ...list, cards: cards.sort(byPosition) };
      })
    );
  }

  private applyListPositions(positions: PositionUpdate[]): void {
    const byId = new Map(positions.map((update) => [update.id, update.position]));

    this.listData.update((lists) =>
      lists
        .map((list) => (byId.has(list.id) ? { ...list, position: byId.get(list.id)! } : list))
        .sort(byPosition)
    );
  }

  private upsertList(incoming: BoardList): void {
    this.listData.update((lists) => {
      const exists = lists.some((list) => list.id === incoming.id);

      const next = exists
        ? lists.map((list) => (list.id === incoming.id ? { ...incoming, cards: list.cards } : list))
        : [...lists, incoming];

      return next.sort(byPosition);
    });
  }

  private patchList(listId: string, patch: (list: BoardList) => BoardList): void {
    this.listData.update((lists) => lists.map((list) => (list.id === listId ? patch(list) : list)));
  }

  private removeList(listId: string): void {
    this.listData.update((lists) => lists.filter((list) => list.id !== listId));
  }
}

function byPosition(a: { position: number }, b: { position: number }): number {
  return a.position - b.position;
}
