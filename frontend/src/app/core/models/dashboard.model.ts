import { BoardSummary, Label } from './board.model';
import { BoardBackground, UserSummary } from './common.model';
import { Invitation, Workspace } from './workspace.model';

export interface DashboardStats {
  workspaceCount: number;
  boardCount: number;
  assignedCardCount: number;
  overdueCardCount: number;
}

export interface AssignedCard {
  id: string;
  title: string;
  dueDate: string | null;
  isCompleted: boolean;
  boardId: string;
  boardName: string;
  boardBackground: BoardBackground;
  listName: string;
  workspaceName: string;
  labels: Label[];
  assignees: UserSummary[];
}

export interface Dashboard {
  workspaces: Workspace[];
  recentBoards: BoardSummary[];
  myCards: AssignedCard[];
  pendingInvitations: Invitation[];
  stats: DashboardStats;
}

export interface CardSearchResult {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  isCompleted: boolean;
  boardId: string;
  boardName: string;
  listName: string;
  workspaceId: string;
  workspaceName: string;
  labels: Label[];
  assignees: UserSummary[];
}

export type DueFilter = 'Any' | 'Overdue' | 'Today' | 'ThisWeek' | 'NoDueDate';

export interface CardSearchQuery {
  query?: string;
  workspaceId?: string;
  boardId?: string;
  labelId?: string;
  assigneeId?: string;
  due?: DueFilter;
  includeCompleted?: boolean;
  take?: number;
}
