import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { PagedResult } from '../models/common.model';
import { AppNotification } from '../models/notification.model';
import { notificationText } from '../utils/notification-text';
import { RealtimeService } from './realtime.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly realtime = inject(RealtimeService);
  private readonly toast = inject(ToastService);
  private readonly base = `${API_BASE_URL}/notifications`;

  private readonly items = signal<AppNotification[]>([]);
  private unsubscribe: (() => void) | null = null;

  readonly notifications = this.items.asReadonly();
  readonly unreadCount = computed(() => this.items().filter((n) => !n.isRead).length);

  /**
   * Arranca la escucha en vivo y trae lo acumulado. Lo llama el shell de la app, que solo
   * existe con sesión abierta.
   */
  start(): void {
    if (!this.unsubscribe) {
      this.unsubscribe = this.realtime.on('NotificationReceived', (notification) => {
        this.items.update((list) => [notification, ...list]);
        this.toast.info(notificationText(notification));
      });
    }

    this.load().subscribe();
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.items.set([]);
  }

  load(pageSize = 30): Observable<PagedResult<AppNotification>> {
    return this.http
      .get<PagedResult<AppNotification>>(this.base, { params: { page: 1, pageSize } })
      .pipe(tap((result) => this.items.set(result.items)));
  }

  markRead(id: string): void {
    // Optimista: marcar como leído nunca falla de forma interesante, y esperar al servidor
    // para apagar el punto rojo se nota.
    this.items.update((list) =>
      list.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );

    this.http.put<void>(`${this.base}/${id}/read`, {}).subscribe();
  }

  markAllRead(): void {
    this.items.update((list) => list.map((item) => ({ ...item, isRead: true })));
    this.http.put<void>(`${this.base}/read-all`, {}).subscribe();
  }

  remove(id: string): void {
    this.items.update((list) => list.filter((item) => item.id !== id));
    this.http.delete<void>(`${this.base}/${id}`).subscribe();
  }

  /** Quita de la lista la invitación ya respondida, para que la campana no la ofrezca dos veces. */
  clearInvitation(invitationId: string): void {
    this.items.update((list) => list.filter((item) => item.invitationId !== invitationId));
  }
}
