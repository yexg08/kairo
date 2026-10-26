import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { PagedResult } from '../models/common.model';
import { Activity } from '../models/activity.model';
import {
  ArchiveRequest,
  BoardDetail,
  BoardList,
  BoardSummary,
  CreateBoardRequest,
  CreateLabelRequest,
  CreateListRequest,
  Label,
  MoveListRequest,
  UpdateBoardRequest,
  UpdateLabelRequest,
  UpdateListRequest
} from '../models/board.model';

@Injectable({ providedIn: 'root' })
export class BoardsService {
  private readonly http = inject(HttpClient);
  private readonly boards = `${API_BASE_URL}/boards`;
  private readonly lists = `${API_BASE_URL}/lists`;
  private readonly labels = `${API_BASE_URL}/labels`;

  getById(id: string): Observable<BoardDetail> {
    return this.http.get<BoardDetail>(`${this.boards}/${id}`);
  }

  getRecent(take = 6): Observable<BoardSummary[]> {
    return this.http.get<BoardSummary[]>(`${this.boards}/recent`, { params: { take } });
  }

  create(request: CreateBoardRequest): Observable<BoardDetail> {
    return this.http.post<BoardDetail>(this.boards, request);
  }

  update(id: string, request: UpdateBoardRequest): Observable<void> {
    return this.http.put<void>(`${this.boards}/${id}`, request);
  }

  setArchived(id: string, request: ArchiveRequest): Observable<void> {
    return this.http.put<void>(`${this.boards}/${id}/archive`, request);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.boards}/${id}`);
  }

  getActivity(boardId: string, page = 1, pageSize = 25): Observable<PagedResult<Activity>> {
    return this.http.get<PagedResult<Activity>>(`${this.boards}/${boardId}/activity`, {
      params: { page, pageSize }
    });
  }

  // --- Listas ---

  createList(boardId: string, request: CreateListRequest): Observable<BoardList> {
    return this.http.post<BoardList>(`${this.boards}/${boardId}/lists`, request);
  }

  renameList(listId: string, request: UpdateListRequest): Observable<BoardList> {
    return this.http.put<BoardList>(`${this.lists}/${listId}`, request);
  }

  moveList(listId: string, request: MoveListRequest): Observable<void> {
    return this.http.put<void>(`${this.lists}/${listId}/move`, request);
  }

  setListArchived(listId: string, request: ArchiveRequest): Observable<void> {
    return this.http.put<void>(`${this.lists}/${listId}/archive`, request);
  }

  removeList(listId: string): Observable<void> {
    return this.http.delete<void>(`${this.lists}/${listId}`);
  }

  // --- Etiquetas ---

  getLabels(boardId: string): Observable<Label[]> {
    return this.http.get<Label[]>(`${this.boards}/${boardId}/labels`);
  }

  createLabel(boardId: string, request: CreateLabelRequest): Observable<Label> {
    return this.http.post<Label>(`${this.boards}/${boardId}/labels`, request);
  }

  updateLabel(labelId: string, request: UpdateLabelRequest): Observable<Label> {
    return this.http.put<Label>(`${this.labels}/${labelId}`, request);
  }

  removeLabel(labelId: string): Observable<void> {
    return this.http.delete<void>(`${this.labels}/${labelId}`);
  }
}
