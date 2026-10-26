import { Card } from './board.model';
import { LabelColor, UserSummary } from './common.model';

export interface ChecklistItem {
  id: string;
  cardId: string;
  text: string;
  isCompleted: boolean;
  position: number;
}

export interface Comment {
  id: string;
  cardId: string;
  text: string;
  createdAt: string;
  updatedAt: string | null;
  author: UserSummary;
}

export interface CardDetail extends Card {
  description: string | null;
  createdBy: UserSummary | null;
  createdAt: string;
  updatedAt: string;
  boardId: string;
  listName: string;
  checklistItems: ChecklistItem[];
  comments: Comment[];
}

export interface CreateCardRequest {
  boardListId: string;
  title: string;
  atTop: boolean;
}

export interface UpdateCardRequest {
  title: string;
  description: string | null;
  dueDate: string | null;
  isCompleted: boolean;
  coverColor: LabelColor | null;
}

export interface MoveCardRequest {
  targetListId: string;
  newIndex: number;
}

export interface CardAssigneeRequest {
  userId: string;
}

export interface CreateChecklistItemRequest {
  text: string;
}

export interface UpdateChecklistItemRequest {
  text: string;
  isCompleted: boolean;
}

export interface CreateCommentRequest {
  text: string;
}

export type UpdateCommentRequest = CreateCommentRequest;
