import { UserSummary } from './common.model';

export type NotificationType =
  | 'CardAssigned'
  | 'CardUnassigned'
  | 'CommentOnCard'
  | 'DueDateChanged'
  | 'WorkspaceInvitation'
  | 'InvitationAccepted'
  | 'RoleChanged'
  | 'RemovedFromWorkspace';

export interface AppNotification {
  id: string;
  type: NotificationType;
  actor: UserSummary | null;
  workspaceId: string | null;
  boardId: string | null;
  cardId: string | null;
  invitationId: string | null;
  workspaceName: string | null;
  boardName: string | null;
  cardTitle: string | null;
  detail: string | null;
  isRead: boolean;
  createdAt: string;
}
