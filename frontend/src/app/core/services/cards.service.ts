import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { ArchiveRequest, Card } from '../models/board.model';
import {
  CardAssigneeRequest,
  CardDetail,
  ChecklistItem,
  Comment,
  CreateCardRequest,
  CreateChecklistItemRequest,
  CreateCommentRequest,
  MoveCardRequest,
  UpdateCardRequest,
  UpdateChecklistItemRequest,
  UpdateCommentRequest
} from '../models/card.model';

@Injectable({ providedIn: 'root' })
export class CardsService {
  private readonly http = inject(HttpClient);
  private readonly cards = `${API_BASE_URL}/cards`;
  private readonly checklist = `${API_BASE_URL}/checklist`;
  private readonly comments = `${API_BASE_URL}/comments`;

  getById(id: string): Observable<CardDetail> {
    return this.http.get<CardDetail>(`${this.cards}/${id}`);
  }

  create(request: CreateCardRequest): Observable<Card> {
    return this.http.post<Card>(this.cards, request);
  }

  update(id: string, request: UpdateCardRequest): Observable<Card> {
    return this.http.put<Card>(`${this.cards}/${id}`, request);
  }

  move(id: string, request: MoveCardRequest): Observable<Card> {
    return this.http.put<Card>(`${this.cards}/${id}/move`, request);
  }

  setArchived(id: string, request: ArchiveRequest): Observable<void> {
    return this.http.put<void>(`${this.cards}/${id}/archive`, request);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.cards}/${id}`);
  }

  addAssignee(id: string, request: CardAssigneeRequest): Observable<Card> {
    return this.http.post<Card>(`${this.cards}/${id}/assignees`, request);
  }

  removeAssignee(id: string, userId: string): Observable<Card> {
    return this.http.delete<Card>(`${this.cards}/${id}/assignees/${userId}`);
  }

  addLabel(id: string, labelId: string): Observable<Card> {
    return this.http.post<Card>(`${this.cards}/${id}/labels/${labelId}`, {});
  }

  removeLabel(id: string, labelId: string): Observable<Card> {
    return this.http.delete<Card>(`${this.cards}/${id}/labels/${labelId}`);
  }

  // --- Checklist ---

  addChecklistItem(cardId: string, request: CreateChecklistItemRequest): Observable<ChecklistItem> {
    return this.http.post<ChecklistItem>(`${this.cards}/${cardId}/checklist`, request);
  }

  updateChecklistItem(
    itemId: string,
    request: UpdateChecklistItemRequest
  ): Observable<ChecklistItem> {
    return this.http.put<ChecklistItem>(`${this.checklist}/${itemId}`, request);
  }

  removeChecklistItem(itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.checklist}/${itemId}`);
  }

  // --- Comentarios ---

  getComments(cardId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.cards}/${cardId}/comments`);
  }

  addComment(cardId: string, request: CreateCommentRequest): Observable<Comment> {
    return this.http.post<Comment>(`${this.cards}/${cardId}/comments`, request);
  }

  updateComment(commentId: string, request: UpdateCommentRequest): Observable<Comment> {
    return this.http.put<Comment>(`${this.comments}/${commentId}`, request);
  }

  removeComment(commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.comments}/${commentId}`);
  }
}
