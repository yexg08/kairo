import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, switchMap, tap } from 'rxjs';
import { BoardDetail, BoardSummary } from '../../core/models/board.model';
import { BoardBackground } from '../../core/models/common.model';
import { Workspace as WorkspaceModel, WorkspaceMember } from '../../core/models/workspace.model';
import { WorkspacesService } from '../../core/services/workspaces.service';
import { WorkspaceStore } from '../../core/state/workspace-store';
import { AvatarStack } from '../../shared/components/avatar-stack/avatar-stack';
import { CreateBoardDialog } from '../../shared/components/create-board-dialog/create-board-dialog';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Spinner } from '../../shared/components/spinner/spinner';
import { BtnDirective } from '../../shared/design/button';
import { BOARD_BACKGROUND_CLASSES, WORKSPACE_DOT_CLASSES } from '../../shared/design/palette';
import { Icon } from '../../shared/icons/icon';

@Component({
  selector: 'app-workspace',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AvatarStack,
    CreateBoardDialog,
    EmptyState,
    Icon,
    Spinner,
    BtnDirective
  ],
  template: `
    <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      @if (loading()) {
        <div class="flex justify-center py-24 text-fog">
          <app-spinner [size]="24" label="Cargando espacio" />
        </div>
      } @else if (workspace(); as ws) {
        <header class="mb-8 flex flex-wrap items-start gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2.5">
              <span class="h-2.5 w-2.5 rounded-full" [class]="dotClass()"></span>
              <h1 class="truncate text-2xl font-medium sm:text-3xl">{{ ws.name }}</h1>
            </div>
            @if (ws.description) {
              <p class="mt-2 max-w-2xl text-sm leading-relaxed text-fog">{{ ws.description }}</p>
            }
          </div>

          <div class="flex items-center gap-3">
            @if (memberSummaries().length > 0) {
              <app-avatar-stack [users]="memberSummaries()" [max]="4" size="md" />
            }

            @if (ws.myRole !== 'Member') {
              <a [routerLink]="['/app/w', ws.id, 'settings']" appBtn="subtle" size="md">
                <app-icon name="cog-6-tooth" [size]="16" />
                <span class="hidden sm:inline">Configuración</span>
              </a>
            }

            <button type="button" appBtn="primary" (click)="showBoardDialog.set(true)">
              <app-icon name="plus" [size]="16" />
              Tablero
            </button>
          </div>
        </header>

        @if (boards().length === 0) {
          <div class="rounded-xl bg-carbon ring-1 ring-graphite">
            <app-empty-state
              icon="squares-plus"
              title="Este espacio no tiene tableros"
              description="Un tablero es donde viven las listas y las tarjetas del equipo."
            >
              <button type="button" appBtn="primary" (click)="showBoardDialog.set(true)">
                <app-icon name="plus" [size]="15" />
                Crear el primero
              </button>
            </app-empty-state>
          </div>
        } @else {
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            @for (board of boards(); track board.id) {
              <a
                [routerLink]="['/app/b', board.id]"
                class="group/board relative flex h-36 flex-col overflow-hidden rounded-lg p-4 ring-1
                       ring-graphite transition-all duration-200 hover:-translate-y-0.5 hover:ring-smoke"
                [class]="thumbClass(board.background)"
              >
                <p class="truncate text-sm font-medium text-paper">{{ board.name }}</p>
                @if (board.description) {
                  <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-white/55">
                    {{ board.description }}
                  </p>
                }

                <div class="mt-auto flex items-center gap-3 text-[11px] text-white/60">
                  <span class="flex items-center gap-1">
                    <app-icon name="view-columns" [size]="12" />
                    {{ board.listCount }}
                  </span>
                  <span class="flex items-center gap-1">
                    <app-icon name="rectangle-stack" [size]="12" />
                    {{ board.cardCount }}
                  </span>
                  <span
                    class="ml-auto translate-x-1 opacity-0 transition-all duration-200
                           group-hover/board:translate-x-0 group-hover/board:opacity-100"
                  >
                    <app-icon name="arrow-right" [size]="14" />
                  </span>
                </div>
              </a>
            }
          </div>
        }
      } @else {
        <app-empty-state
          icon="lock-closed"
          title="No tienes acceso a este espacio"
          description="Puede que te hayan quitado o que el enlace ya no sea válido."
        >
          <a routerLink="/app" appBtn="subtle">Volver al inicio</a>
        </app-empty-state>
      }
    </div>

    <app-create-board-dialog
      [open]="showBoardDialog()"
      [workspaceId]="workspaceId()"
      (close)="showBoardDialog.set(false)"
      (created)="onBoardCreated($event)"
    />
  `
})
export class Workspace {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(WorkspacesService);
  private readonly store = inject(WorkspaceStore);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly showBoardDialog = signal(false);
  protected readonly workspace = signal<WorkspaceModel | null>(null);
  protected readonly boards = signal<BoardSummary[]>([]);
  protected readonly members = signal<WorkspaceMember[]>([]);

  protected readonly workspaceId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('workspaceId') ?? '')),
    { initialValue: '' }
  );

  /** Los miembros se pintan con el mismo componente de avatares que el resto de la app. */
  protected readonly memberSummaries = computed(() =>
    this.members().map((member) => ({
      id: member.userId,
      displayName: member.displayName,
      email: member.email,
      avatarColor: member.avatarColor,
      initials: member.initials
    }))
  );

  protected readonly dotClass = computed(() => {
    const color = this.workspace()?.color ?? 'indigo';
    return WORKSPACE_DOT_CLASSES[color];
  });

  constructor() {
    // Cambiar de espacio en la barra lateral reutiliza el componente, así que la recarga
    // cuelga del parámetro de ruta y no del ciclo de vida.
    this.route.paramMap
      .pipe(
        map((params) => params.get('workspaceId') ?? ''),
        tap(() => this.loading.set(true)),
        switchMap((id) => this.loadWorkspace(id)),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  protected thumbClass(background: BoardBackground): string {
    return BOARD_BACKGROUND_CLASSES[background].thumb;
  }

  protected onBoardCreated(board: BoardDetail): void {
    this.showBoardDialog.set(false);
    void this.router.navigate(['/app/b', board.id]);
  }

  private loadWorkspace(id: string) {
    return this.service.getById(id).pipe(
      tap({
        next: (workspace) => {
          this.workspace.set(workspace);
          this.store.upsert(workspace);
          this.loadBoards(id);
          this.loadMembers(id);
        },
        error: () => {
          this.workspace.set(null);
          this.loading.set(false);
        }
      })
    );
  }

  private loadBoards(id: string): void {
    this.service.getBoards(id).subscribe({
      next: (boards) => {
        this.boards.set(boards);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private loadMembers(id: string): void {
    this.service.getMembers(id).subscribe({
      next: (members) => this.members.set(members)
    });
  }
}
