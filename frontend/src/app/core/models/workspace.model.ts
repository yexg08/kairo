import { AvatarColor } from './common.model';

/** Llegan como texto porque la API serializa los enums con JsonStringEnumConverter. */
export type WorkspaceRole = 'Owner' | 'Admin' | 'Member';
export type InvitationStatus = 'Pending' | 'Accepted' | 'Declined' | 'Revoked';

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  color: AvatarColor;
  myRole: WorkspaceRole;
  memberCount: number;
  boardCount: number;
  createdAt: string;
}

export interface WorkspaceMember {
  userId: string;
  displayName: string;
  email: string | null;
  avatarColor: AvatarColor;
  initials: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  workspaceColor: AvatarColor;
  invitedByName: string;
  invitedUserName: string;
  invitedUserEmail: string | null;
  invitedUserAvatarColor: AvatarColor;
  role: WorkspaceRole;
  status: InvitationStatus;
  createdAt: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  description: string | null;
  color: AvatarColor;
}

export type UpdateWorkspaceRequest = CreateWorkspaceRequest;

export interface InviteMemberRequest {
  emailOrUsername: string;
  role: WorkspaceRole;
}

export interface UpdateMemberRoleRequest {
  role: WorkspaceRole;
}
