import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { BoardSummary } from '../models/board.model';
import {
  CreateWorkspaceRequest,
  Invitation,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
  UpdateWorkspaceRequest,
  Workspace,
  WorkspaceMember
} from '../models/workspace.model';

@Injectable({ providedIn: 'root' })
export class WorkspacesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/workspaces`;

  getMine(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(this.base);
  }

  getById(id: string): Observable<Workspace> {
    return this.http.get<Workspace>(`${this.base}/${id}`);
  }

  create(request: CreateWorkspaceRequest): Observable<Workspace> {
    return this.http.post<Workspace>(this.base, request);
  }

  update(id: string, request: UpdateWorkspaceRequest): Observable<Workspace> {
    return this.http.put<Workspace>(`${this.base}/${id}`, request);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  getBoards(id: string, includeArchived = false): Observable<BoardSummary[]> {
    return this.http.get<BoardSummary[]>(`${this.base}/${id}/boards`, {
      params: { includeArchived }
    });
  }

  getMembers(id: string): Observable<WorkspaceMember[]> {
    return this.http.get<WorkspaceMember[]>(`${this.base}/${id}/members`);
  }

  getPendingInvitations(id: string): Observable<Invitation[]> {
    return this.http.get<Invitation[]>(`${this.base}/${id}/invitations`);
  }

  invite(id: string, request: InviteMemberRequest): Observable<Invitation> {
    return this.http.post<Invitation>(`${this.base}/${id}/invitations`, request);
  }

  revokeInvitation(id: string, invitationId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/invitations/${invitationId}`);
  }

  updateMemberRole(
    id: string,
    memberUserId: string,
    request: UpdateMemberRoleRequest
  ): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/members/${memberUserId}/role`, request);
  }

  removeMember(id: string, memberUserId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/members/${memberUserId}`);
  }
}
