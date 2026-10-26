import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AVATAR_COLORS, ApiErrorBody, AvatarColor } from '../../core/models/common.model';
import {
  Invitation,
  Workspace,
  WorkspaceMember,
  WorkspaceRole
} from '../../core/models/workspace.model';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspacesService } from '../../core/services/workspaces.service';
import { WorkspaceStore } from '../../core/state/workspace-store';
import { Avatar } from '../../shared/components/avatar/avatar';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Spinner } from '../../shared/components/spinner/spinner';
import { BtnDirective } from '../../shared/design/button';
import { WORKSPACE_DOT_CLASSES } from '../../shared/design/palette';
import { Icon } from '../../shared/icons/icon';

@Component({
  selector: 'app-workspace-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Avatar,
    EmptyState,
    Icon,
    Spinner,
    BtnDirective
  ],
  templateUrl: './workspace-settings.html'
})
export class WorkspaceSettings implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(WorkspacesService);
  private readonly store = inject(WorkspaceStore);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly colors = AVATAR_COLORS;
  protected readonly loading = signal(true);
  protected readonly savingGeneral = signal(false);
  protected readonly inviting = signal(false);
  protected readonly color = signal<AvatarColor>('indigo');

  protected readonly workspace = signal<Workspace | null>(null);
  protected readonly members = signal<WorkspaceMember[]>([]);
  protected readonly pendingInvitations = signal<Invitation[]>([]);

  protected readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? '');
  protected readonly isOwner = computed(() => this.workspace()?.myRole === 'Owner');
  protected readonly canManage = computed(() => this.workspace()?.myRole !== 'Member');

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: ['']
  });

  protected readonly inviteForm = this.formBuilder.nonNullable.group({
    emailOrUsername: ['', [Validators.required]],
    role: ['Member' as WorkspaceRole, [Validators.required]]
  });

  private get workspaceId(): string {
    return this.route.snapshot.paramMap.get('workspaceId') ?? '';
  }

  ngOnInit(): void {
    this.load();
  }

  protected dotClass(color: AvatarColor): string {
    return WORKSPACE_DOT_CLASSES[color];
  }

  protected saveGeneral(): void {
    if (this.form.invalid || this.savingGeneral()) return;

    this.savingGeneral.set(true);
    const { name, description } = this.form.getRawValue();

    this.service
      .update(this.workspaceId, { name, description: description || null, color: this.color() })
      .subscribe({
        next: (workspace) => {
          this.savingGeneral.set(false);
          this.workspace.set(workspace);
          this.store.upsert(workspace);
          this.toast.success('Espacio actualizado.');
        },
        error: (error: HttpErrorResponse) => {
          this.savingGeneral.set(false);
          this.showError(error, 'No se pudo guardar el espacio.');
        }
      });
  }

  protected invite(): void {
    if (this.inviteForm.invalid || this.inviting()) return;

    this.inviting.set(true);

    this.service.invite(this.workspaceId, this.inviteForm.getRawValue()).subscribe({
      next: (invitation) => {
        this.inviting.set(false);
        this.inviteForm.controls.emailOrUsername.reset('');
        this.pendingInvitations.update((list) => [invitation, ...list]);
        this.toast.success(`Invitación enviada a ${invitation.invitedUserName}.`);
      },
      error: (error: HttpErrorResponse) => {
        this.inviting.set(false);
        this.showError(error, 'No se pudo enviar la invitación.');
      }
    });
  }

  protected revoke(invitation: Invitation): void {
    this.service.revokeInvitation(this.workspaceId, invitation.id).subscribe({
      next: () => {
        this.pendingInvitations.update((list) =>
          list.filter((item) => item.id !== invitation.id)
        );
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No se pudo cancelar.')
    });
  }

  protected changeRole(member: WorkspaceMember, event: Event): void {
    const role = (event.target as HTMLSelectElement).value as WorkspaceRole;

    this.service.updateMemberRole(this.workspaceId, member.userId, { role }).subscribe({
      next: () => {
        this.members.update((list) =>
          list.map((item) => (item.userId === member.userId ? { ...item, role } : item))
        );
        this.toast.success(`${member.displayName} ahora es ${role}.`);
      },
      error: (error: HttpErrorResponse) => {
        this.showError(error, 'No se pudo cambiar el rol.');
        // El <select> ya mostró el valor nuevo; se recarga para no dejarlo mintiendo.
        this.loadMembers();
      }
    });
  }

  protected async removeMember(member: WorkspaceMember): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: `¿Quitar a ${member.displayName}?`,
      message:
        'Dejará de ver los tableros de este espacio y se le quitará de las tarjetas que tenga asignadas.',
      confirmLabel: 'Quitar',
      danger: true
    });

    if (!confirmed) return;

    this.service.removeMember(this.workspaceId, member.userId).subscribe({
      next: () => {
        this.members.update((list) => list.filter((item) => item.userId !== member.userId));
        this.toast.success(`${member.displayName} ya no está en el espacio.`);
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No se pudo quitar a esa persona.')
    });
  }

  protected async deleteWorkspace(): Promise<void> {
    const workspace = this.workspace();
    if (!workspace) return;

    const confirmed = await this.confirm.ask({
      title: `¿Eliminar ${workspace.name}?`,
      message:
        'Se borran sus tableros, listas, tarjetas y comentarios. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar espacio',
      danger: true
    });

    if (!confirmed) return;

    this.service.remove(workspace.id).subscribe({
      next: () => {
        this.store.remove(workspace.id);
        this.toast.success('Espacio eliminado.');
        void this.router.navigate(['/app']);
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No se pudo eliminar el espacio.')
    });
  }

  protected async leaveWorkspace(): Promise<void> {
    const workspace = this.workspace();
    if (!workspace) return;

    const confirmed = await this.confirm.ask({
      title: `¿Salir de ${workspace.name}?`,
      message: 'Perderás el acceso a sus tableros. Alguien tendría que volver a invitarte.',
      confirmLabel: 'Salir',
      danger: true
    });

    if (!confirmed) return;

    this.service.removeMember(workspace.id, this.currentUserId()).subscribe({
      next: () => {
        this.store.remove(workspace.id);
        this.toast.success(`Saliste de ${workspace.name}.`);
        void this.router.navigate(['/app']);
      },
      error: (error: HttpErrorResponse) => this.showError(error, 'No se pudo salir del espacio.')
    });
  }

  private load(): void {
    this.service.getById(this.workspaceId).subscribe({
      next: (workspace) => {
        this.workspace.set(workspace);
        this.color.set(workspace.color);
        this.form.setValue({ name: workspace.name, description: workspace.description ?? '' });
        this.loading.set(false);

        this.loadMembers();
        if (workspace.myRole !== 'Member') this.loadInvitations();
      },
      error: () => {
        this.workspace.set(null);
        this.loading.set(false);
      }
    });
  }

  private loadMembers(): void {
    this.service.getMembers(this.workspaceId).subscribe({
      next: (members) => this.members.set(members)
    });
  }

  private loadInvitations(): void {
    this.service.getPendingInvitations(this.workspaceId).subscribe({
      next: (invitations) => this.pendingInvitations.set(invitations)
    });
  }

  private showError(error: HttpErrorResponse, fallback: string): void {
    const body = error.error as ApiErrorBody | null;
    this.toast.error(body?.message ?? fallback);
  }
}
