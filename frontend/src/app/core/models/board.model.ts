import { BoardBackground, LabelColor, UserSummary } from './common.model';
import { WorkspaceMember, WorkspaceRole } from './workspace.model';

export interface Label {
  id: string;
  boardId: string;
  name: string;
  color: LabelColor;
}

export interface Card {
  id: string;
  boardListId: string;
  title: string;
  hasDescription: boolean;
  position: number;
  dueDate: string | null;
  isCompleted: boolean;
  coverColor: LabelColor | null;
  isArchived: boolean;
  labels: Label[];
  assignees: UserSummary[];
  checklistTotal: number;
  checklistDone: number;
  commentCount: number;
}

export interface BoardList {
  id: string;
  boardId: string;
  name: string;
  position: number;
  isArchived: boolean;
  cards: Card[];
}

export interface BoardSummary {
  id: string;
  workspaceId: string;
  workspaceName: string;
  name: string;
  description: string | null;
  background: BoardBackground;
  isArchived: boolean;
  listCount: number;
  cardCount: number;
  updatedAt: string;
  lastVisitedAt: string | null;
}

export interface BoardDetail {
  id: string;
  workspaceId: string;
  workspaceName: string;
  name: string;
  description: string | null;
  background: BoardBackground;
  isArchived: boolean;
  myRole: WorkspaceRole;
  createdAt: string;
  lists: BoardList[];
  labels: Label[];
  members: WorkspaceMember[];
}

export interface CreateBoardRequest {
  workspaceId: string;
  name: string;
  description: string | null;
  background: BoardBackground;
  useStarterTemplate: boolean;
}

export interface UpdateBoardRequest {
  name: string;
  description: string | null;
  background: BoardBackground;
}

export interface ArchiveRequest {
  isArchived: boolean;
}

export interface CreateListRequest {
  name: string;
}

export type UpdateListRequest = CreateListRequest;

/**
 * El cliente manda el índice donde soltó, no una posición: es justo lo que devuelve el CDK
 * y evita que el front tenga que replicar la aritmética de posiciones del servidor.
 */
export interface MoveListRequest {
  newIndex: number;
}

export interface CreateLabelRequest {
  name: string;
  color: LabelColor;
}

export type UpdateLabelRequest = CreateLabelRequest;
