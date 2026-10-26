import { UserSummary } from './common.model';

export type ActivityType =
  | 'BoardCreated'
  | 'BoardRenamed'
  | 'ListCreated'
  | 'ListRenamed'
  | 'ListMoved'
  | 'ListArchived'
  | 'CardCreated'
  | 'CardRenamed'
  | 'CardMoved'
  | 'CardDescriptionUpdated'
  | 'CardArchived'
  | 'CardDueDateSet'
  | 'CardDueDateCleared'
  | 'CardCompleted'
  | 'CardReopened'
  | 'CardAssigned'
  | 'CardUnassigned'
  | 'LabelAdded'
  | 'LabelRemoved'
  | 'ChecklistItemAdded'
  | 'ChecklistItemCompleted'
  | 'ChecklistItemReopened'
  | 'ChecklistItemRemoved'
  | 'CommentAdded'
  | 'MemberJoined'
  | 'MemberLeft'
  | 'MemberRoleChanged';

export interface Activity {
  id: string;
  boardId: string;
  type: ActivityType;
  actor: UserSummary;
  cardId: string | null;
  cardTitle: string | null;
  fromListName: string | null;
  toListName: string | null;
  detail: string | null;
  createdAt: string;
}
