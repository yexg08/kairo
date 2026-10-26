import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AvatarColor, BoardBackground } from '../../core/models/common.model';
import { Dashboard as DashboardData } from '../../core/models/dashboard.model';
import { Invitation, Workspace } from '../../core/models/workspace.model';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { InvitationsService } from '../../core/services/invitations.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/state/workspace-store';
import { DUE_STATE_CLASSES, dueState, formatDueDate } from '../../core/utils/dates';
import { CreateWorkspaceDialog } from '../../shared/components/create-workspace-dialog/create-workspace-dialog';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { LabelChip } from '../../shared/components/label-chip/label-chip';
import { Spinner } from '../../shared/components/spinner/spinner';
import { BtnDirective } from '../../shared/design/button';
import { BOARD_BACKGROUND_CLASSES, WORKSPACE_DOT_CLASSES } from '../../shared/design/palette';
import { Icon } from '../../shared/icons/icon';

interface StatTile {
  label: string;
  value: number;
  tone: string;
}

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CreateWorkspaceDialog,
    EmptyState,
    Icon,
    LabelChip,
    Spinner,
    BtnDirective
  ],
  templateUrl: './dashboard.html'
})
export class Dashboard implements OnInit {
  private readonly service = inject(DashboardService);
  private readonly invitations = inject(InvitationsService);
  private readonly store = inject(WorkspaceStore);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly data = signal<DashboardData | null>(null);
  protected readonly loading = signal(true);
  protected readonly showWorkspaceDialog = signal(false);

  protected readonly greeting = computed(() => {
    const name = this.auth.currentUser()?.displayName.split(' ')[0] ?? '';
    const hour = new Date().getHours();
    const moment = hour < 6 ? 'Buenas noches' : hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';

    return name ? `${moment}, ${name}` : moment;
  });

  protected readonly summary = computed(() => {
    const stats = this.data()?.stats;
    if (!stats) return '';

    if (stats.assignedCardCount === 0) {
      return 'No tienes tarjetas asignadas ahora mismo.';
    }

    const pending = `${stats.assignedCardCount} ${stats.assignedCardCount === 1 ? 'tarjeta asignada' : 'tarjetas asignadas'}`;

    return stats.overdueCardCount > 0
      ? `Tienes ${pending}, ${stats.overdueCardCount} con la fecha pasada.`
      : `Tienes ${pending}. Ninguna vencida.`;
  });

  protected readonly stats = computed<StatTile[]>(() => {
    const stats = this.data()?.stats;
    if (!stats) return [];

    return [
      { label: 'Espacios', value: stats.workspaceCount, tone: 'text-paper' },
      { label: 'Tableros', value: stats.boardCount, tone: 'text-paper' },
      { label: 'Asignadas a ti', value: stats.assignedCardCount, tone: 'text-iris-300' },
      {
        label: 'Vencidas',
        value: stats.overdueCardCount,
        // El cero no se pinta de alarma: solo destaca en rojo si de verdad hay algo vencido.
        tone: stats.overdueCardCount > 0 ? 'text-rose-300' : 'text-paper'
      }
    ];
  });

  ngOnInit(): void {
    this.load();
  }

  protected dotClass(color: AvatarColor): string {
    return WORKSPACE_DOT_CLASSES[color];
  }

  protected thumbClass(background: BoardBackground): string {
    return BOARD_BACKGROUND_CLASSES[background].thumb;
  }

  protected dueLabel(iso: string): string {
    return formatDueDate(iso);
  }

  protected dueClass(iso: string | null, isCompleted: boolean): string {
    return DUE_STATE_CLASSES[dueState(iso, isCompleted)];
  }

  protected onWorkspaceCreated(workspace: Workspace): void {
    this.showWorkspaceDialog.set(false);
    void this.router.navigate(['/app/w', workspace.id]);
  }

  protected accept(invitation: Invitation): void {
    this.invitations.accept(invitation.id).subscribe({
      next: (workspace) => {
        this.store.upsert(workspace);
        this.toast.success(`Ya formas parte de ${workspace.name}.`);
        this.load();
      },
      error: () => this.toast.error('Esa invitación ya no está disponible.')
    });
  }

  protected decline(invitation: Invitation): void {
    this.invitations.decline(invitation.id).subscribe({
      next: () => this.load(),
      error: () => this.load()
    });
  }

  private load(): void {
    this.service.getDashboard().subscribe({
      next: (dashboard) => {
        this.data.set(dashboard);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
