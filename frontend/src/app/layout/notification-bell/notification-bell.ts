import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification } from '../../core/models/notification.model';
import { InvitationsService } from '../../core/services/invitations.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/state/workspace-store';
import { relativeTime } from '../../core/utils/dates';
import { notificationText } from '../../core/utils/notification-text';
import { Avatar } from '../../shared/components/avatar/avatar';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { BtnDirective } from '../../shared/design/button';
import { Icon } from '../../shared/icons/icon';

@Component({
  selector: 'app-notification-bell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Avatar, EmptyState, Icon, BtnDirective],
  host: {
    '(document:keydown.escape)': 'open.set(false)'
  },
  template: `
    <div class="relative">
      <button
        type="button"
        appBtn="icon"
        [attr.aria-label]="'Notificaciones' + (unread() ? ', ' + unread() + ' sin leer' : '')"
        [attr.aria-expanded]="open()"
        (click)="toggle()"
      >
        <app-icon name="bell" [size]="18" />
        @if (unread() > 0) {
          <span
            class="animate-pulse-ring absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-iris-400
                   ring-2 ring-carbon"
          ></span>
        }
      </button>

      @if (open()) {
        <!-- Capa transparente que cierra al pulsar fuera, sin robar el foco al panel. -->
        <div class="fixed inset-0 z-40" (click)="open.set(false)" aria-hidden="true"></div>

        <div
          class="animate-pop absolute right-0 z-50 mt-2 flex max-h-[70vh] w-[min(22rem,calc(100vw-2rem))]
                 flex-col rounded-xl bg-carbon shadow-lifted ring-1 ring-graphite"
          role="dialog"
          aria-label="Notificaciones"
        >
          <header class="flex items-center justify-between border-b border-graphite px-4 py-3">
            <span class="text-sm font-medium text-paper">Notificaciones</span>
            @if (unread() > 0) {
              <button
                type="button"
                class="text-xs text-fog transition-colors hover:text-paper"
                (click)="notifications.markAllRead()"
              >
                Marcar todo como leído
              </button>
            }
          </header>

          <div class="scrollbar-slim flex-1 overflow-y-auto">
            @if (items().length === 0) {
              <app-empty-state
                icon="bell"
                title="Nada por aquí"
                description="Cuando te asignen una tarjeta o comenten en la tuya, aparecerá aquí."
              />
            } @else {
              <ul class="divide-y divide-graphite">
                @for (item of items(); track item.id) {
                  <li
                    class="flex gap-3 px-4 py-3 transition-colors"
                    [class]="item.isRead ? '' : 'bg-iris-500/[0.06]'"
                  >
                    @if (item.actor) {
                      <app-avatar
                        size="sm"
                        [displayName]="item.actor.displayName"
                        [initials]="item.actor.initials"
                        [color]="item.actor.avatarColor"
                      />
                    }

                    <div class="min-w-0 flex-1">
                      <p class="text-sm leading-snug text-mist">{{ text(item) }}</p>
                      <p class="mt-1 text-xs text-ash">{{ time(item.createdAt) }}</p>

                      @if (item.type === 'WorkspaceInvitation' && item.invitationId) {
                        <div class="mt-2.5 flex gap-2">
                          <button
                            type="button"
                            appBtn="primary"
                            size="sm"
                            [disabled]="responding() === item.invitationId"
                            (click)="accept(item)"
                          >
                            Aceptar
                          </button>
                          <button
                            type="button"
                            appBtn="ghost"
                            size="sm"
                            [disabled]="responding() === item.invitationId"
                            (click)="decline(item)"
                          >
                            Rechazar
                          </button>
                        </div>
                      } @else if (item.boardId) {
                        <button
                          type="button"
                          class="mt-1.5 text-xs text-iris-300 transition-colors hover:text-iris-200"
                          (click)="openBoard(item)"
                        >
                          Ver tablero
                        </button>
                      }
                    </div>

                    @if (!item.isRead) {
                      <button
                        type="button"
                        class="h-fit rounded-md p-1 text-ash transition-colors hover:text-mist"
                        aria-label="Marcar como leída"
                        (click)="notifications.markRead(item.id)"
                      >
                        <app-icon name="check" [size]="14" />
                      </button>
                    }
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class NotificationBell {
  protected readonly notifications = inject(NotificationsService);
  private readonly invitations = inject(InvitationsService);
  private readonly workspaces = inject(WorkspaceStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly open = signal(false);
  protected readonly responding = signal<string | null>(null);

  protected readonly items = this.notifications.notifications;
  protected readonly unread = computed(() => this.notifications.unreadCount());

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected text(notification: AppNotification): string {
    return notificationText(notification);
  }

  protected time(iso: string): string {
    return relativeTime(iso);
  }

  protected openBoard(notification: AppNotification): void {
    if (!notification.isRead) this.notifications.markRead(notification.id);
    this.open.set(false);

    void this.router.navigate(['/app/b', notification.boardId], {
      queryParams: notification.cardId ? { card: notification.cardId } : {}
    });
  }

  protected accept(notification: AppNotification): void {
    const invitationId = notification.invitationId;
    if (!invitationId) return;

    this.responding.set(invitationId);

    this.invitations.accept(invitationId).subscribe({
      next: (workspace) => {
        this.responding.set(null);
        this.notifications.clearInvitation(invitationId);
        this.workspaces.upsert(workspace);
        this.toast.success(`Ya formas parte de ${workspace.name}.`);
        this.open.set(false);
        void this.router.navigate(['/app/w', workspace.id]);
      },
      error: () => {
        this.responding.set(null);
        this.notifications.clearInvitation(invitationId);
        this.toast.error('Esa invitación ya no está disponible.');
      }
    });
  }

  protected decline(notification: AppNotification): void {
    const invitationId = notification.invitationId;
    if (!invitationId) return;

    this.responding.set(invitationId);

    this.invitations.decline(invitationId).subscribe({
      next: () => {
        this.responding.set(null);
        this.notifications.clearInvitation(invitationId);
      },
      error: () => {
        this.responding.set(null);
        this.notifications.clearInvitation(invitationId);
      }
    });
  }
}
