import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BoardDetail } from '../../core/models/board.model';
import { AvatarColor } from '../../core/models/common.model';
import { Workspace } from '../../core/models/workspace.model';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { WorkspaceStore } from '../../core/state/workspace-store';
import { Avatar } from '../../shared/components/avatar/avatar';
import { CreateBoardDialog } from '../../shared/components/create-board-dialog/create-board-dialog';
import { CreateWorkspaceDialog } from '../../shared/components/create-workspace-dialog/create-workspace-dialog';
import { Logo } from '../../shared/components/logo/logo';
import { BtnDirective } from '../../shared/design/button';
import { WORKSPACE_DOT_CLASSES } from '../../shared/design/palette';
import { Icon } from '../../shared/icons/icon';
import { NotificationBell } from '../notification-bell/notification-bell';
import { SearchDialog } from '../search-dialog/search-dialog';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    Avatar,
    CreateBoardDialog,
    CreateWorkspaceDialog,
    Icon,
    Logo,
    NotificationBell,
    SearchDialog,
    BtnDirective
  ],
  templateUrl: './app-shell.html',
  host: {
    '(document:keydown)': 'onKeydown($event)'
  }
})
export class AppShell implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(RealtimeService);
  private readonly notifications = inject(NotificationsService);
  private readonly store = inject(WorkspaceStore);
  private readonly router = inject(Router);

  protected readonly user = this.auth.currentUser;
  protected readonly workspaces = this.store.workspaces;
  protected readonly realtimeStatus = this.realtime.status;

  protected readonly sidebarOpen = signal(false);
  protected readonly userMenuOpen = signal(false);
  protected readonly showSearch = signal(false);
  protected readonly showWorkspaceDialog = signal(false);
  protected readonly showBoardDialog = signal(false);

  protected readonly shortcutHint = navigator.platform.toLowerCase().includes('mac')
    ? '⌘K'
    : 'Ctrl K';

  protected readonly realtimeLabel = computed(() => {
    switch (this.realtimeStatus()) {
      case 'connecting':
        return 'Conectando';
      case 'reconnecting':
        return 'Reconectando';
      default:
        return 'Sin conexión';
    }
  });

  protected readonly realtimeHint = computed(() =>
    this.realtimeStatus() === 'offline'
      ? 'Los cambios de otras personas no llegarán solos hasta que vuelva la conexión.'
      : 'Restableciendo la conexión en vivo…'
  );

  protected readonly realtimeDotClass = computed(() =>
    this.realtimeStatus() === 'offline' ? 'bg-signal-danger' : 'bg-signal-warn animate-pulse'
  );

  ngOnInit(): void {
    this.store.load();
    void this.realtime.connect();
    this.notifications.start();
  }

  protected dotClass(color: AvatarColor): string {
    return WORKSPACE_DOT_CLASSES[color];
  }

  protected onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.showSearch.set(true);
    }
  }

  protected openBoardDialog(): void {
    this.userMenuOpen.set(false);
    this.showBoardDialog.set(true);
  }

  protected openWorkspaceDialog(): void {
    this.userMenuOpen.set(false);
    this.showWorkspaceDialog.set(true);
  }

  protected onWorkspaceCreated(workspace: Workspace): void {
    this.showWorkspaceDialog.set(false);
    void this.router.navigate(['/app/w', workspace.id]);
  }

  protected onBoardCreated(board: BoardDetail): void {
    this.showBoardDialog.set(false);
    void this.router.navigate(['/app/b', board.id]);
  }

  protected logout(): void {
    this.userMenuOpen.set(false);
    this.notifications.stop();
    void this.realtime.disconnect();
    this.store.reset();
    this.auth.logout();
    void this.router.navigate(['/']);
  }
}
