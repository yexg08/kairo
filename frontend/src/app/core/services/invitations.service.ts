import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { Invitation, Workspace } from '../models/workspace.model';

@Injectable({ providedIn: 'root' })
export class InvitationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/invitations`;

  getMine(): Observable<Invitation[]> {
    return this.http.get<Invitation[]>(this.base);
  }

  accept(id: string): Observable<Workspace> {
    return this.http.post<Workspace>(`${this.base}/${id}/accept`, {});
  }

  decline(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/decline`, {});
  }
}
