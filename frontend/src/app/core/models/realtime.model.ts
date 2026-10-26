import { Activity } from './activity.model';
import { BoardBackground, UserSummary } from './common.model';
import { BoardList, Card, Label } from './board.model';
import { ChecklistItem, Comment } from './card.model';
import { AppNotification } from './notification.model';

/** Nueva posición de un elemento arrastrable. */
export interface PositionUpdate {
  id: string;
  position: number;
}

/**
 * `positions` trae toda la lista destino, no solo la tarjeta movida: el servidor usa
 * indexado fraccionario y de vez en cuando rebalancea, lo que corre también a las vecinas.
 */
export interface CardMovedEvent {
  card: Card;
  fromListId: string;
  toListId: string;
  positions: PositionUpdate[];
}

export interface CardArchivedEvent {
  cardId: string;
  boardListId: string;
}

export interface ListArchivedEvent {
  listId: string;
}

export interface ListRenamedEvent {
  listId: string;
  name: string;
}

export interface ListMovedEvent {
  boardId: string;
  listId: string;
  positions: PositionUpdate[];
}

export interface ChecklistChangedEvent {
  cardId: string;
  items: ChecklistItem[];
  total: number;
  done: number;
}

export interface BoardLabelsChangedEvent {
  boardId: string;
  labels: Label[];
}

export interface CommentDeletedEvent {
  cardId: string;
  commentId: string;
  commentCount: number;
}

export interface BoardInfoChangedEvent {
  boardId: string;
  name: string;
  description: string | null;
  background: BoardBackground;
}

export interface BoardPresenceEvent {
  boardId: string;
  viewers: UserSummary[];
}

/**
 * Espejo de `IBoardClient` en el servidor: los nombres son los del hub, uno a uno. Tenerlos
 * en un mapa tipado hace que `realtime.on('CardMoved', ...)` sepa qué recibe el handler y
 * que un evento mal escrito no compile.
 */
export interface BoardHubEvents {
  CardCreated: Card;
  CardUpdated: Card;
  CardMoved: CardMovedEvent;
  CardArchived: CardArchivedEvent;
  ListCreated: BoardList;
  ListRenamed: ListRenamedEvent;
  ListMoved: ListMovedEvent;
  ListArchived: ListArchivedEvent;
  BoardInfoChanged: BoardInfoChangedEvent;
  BoardLabelsChanged: BoardLabelsChangedEvent;
  ChecklistChanged: ChecklistChangedEvent;
  CommentAdded: Comment;
  CommentUpdated: Comment;
  CommentDeleted: CommentDeletedEvent;
  ActivityAdded: Activity;
  PresenceChanged: BoardPresenceEvent;
  NotificationReceived: AppNotification;
}
