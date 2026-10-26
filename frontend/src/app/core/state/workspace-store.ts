import { Injectable, computed, inject, signal } from '@angular/core';
import { Workspace } from '../models/workspace.model';
import { WorkspacesService } from '../services/workspaces.service';

/**
 * Los espacios del usuario, cargados una vez y compartidos por la barra lateral, el
 * dashboard y los diálogos de "nuevo tablero". Sin esto, cada pantalla pediría la misma
 * lista por su cuenta y se desincronizarían al crear o renombrar uno.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceStore {
  private readonly service = inject(WorkspacesService);

  private readonly items = signal<Workspace[]>([]);
  private readonly isLoading = signal(false);
  private hasLoaded = false;

  readonly workspaces = this.items.asReadonly();
  readonly loading = this.isLoading.asReadonly();
  readonly isEmpty = computed(() => this.hasLoaded && this.items().length === 0);

  load(force = false): void {
    if (this.isLoading() || (this.hasLoaded && !force)) return;

    this.isLoading.set(true);
    this.service.getMine().subscribe({
      next: (workspaces) => {
        this.items.set(workspaces);
        this.hasLoaded = true;
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  upsert(workspace: Workspace): void {
    this.items.update((list) => {
      const index = list.findIndex((item) => item.id === workspace.id);
      if (index === -1) return [...list, workspace];

      const next = [...list];
      next[index] = workspace;
      return next;
    });
  }

  remove(id: string): void {
    this.items.update((list) => list.filter((item) => item.id !== id));
  }

  byId(id: string): Workspace | undefined {
    return this.items().find((item) => item.id === id);
  }

  reset(): void {
    this.items.set([]);
    this.hasLoaded = false;
  }
}
