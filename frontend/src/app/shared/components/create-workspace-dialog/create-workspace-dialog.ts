import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AVATAR_COLORS, ApiErrorBody, AvatarColor } from '../../../core/models/common.model';
import { Workspace } from '../../../core/models/workspace.model';
import { ToastService } from '../../../core/services/toast.service';
import { WorkspacesService } from '../../../core/services/workspaces.service';
import { WorkspaceStore } from '../../../core/state/workspace-store';
import { BtnDirective } from '../../design/button';
import { WORKSPACE_DOT_CLASSES } from '../../design/palette';
import { Icon } from '../../icons/icon';
import { Modal } from '../modal/modal';
import { Spinner } from '../spinner/spinner';

@Component({
  selector: 'app-create-workspace-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BtnDirective, Icon, Modal, Spinner],
  template: `
    <app-modal
      size="sm"
      title="Nuevo espacio"
      subtitle="Un espacio agrupa los tableros de un equipo."
      [open]="open()"
      (close)="close.emit()"
    >
      <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
        <div>
          <label class="mb-1.5 block text-sm text-mist" for="ws-name">Nombre</label>
          <input
            id="ws-name"
            type="text"
            formControlName="name"
            class="h-10 w-full rounded-md bg-obsidian px-3 text-sm text-paper ring-1 ring-graphite
                   placeholder:text-ash focus:outline-none focus:ring-2 focus:ring-iris-500"
            placeholder="Equipo de producto"
          />
        </div>

        <div>
          <label class="mb-1.5 block text-sm text-mist" for="ws-description">
            Descripción <span class="text-ash">(opcional)</span>
          </label>
          <textarea
            id="ws-description"
            rows="2"
            formControlName="description"
            class="w-full resize-none rounded-md bg-obsidian px-3 py-2 text-sm text-paper ring-1
                   ring-graphite placeholder:text-ash focus:outline-none focus:ring-2 focus:ring-iris-500"
            placeholder="De qué se ocupa este equipo"
          ></textarea>
        </div>

        <div>
          <span class="mb-2 block text-sm text-mist">Color</span>
          <div class="flex flex-wrap gap-2">
            @for (option of colors; track option) {
              <button
                type="button"
                class="h-7 w-7 rounded-full transition-transform duration-150 hover:scale-110"
                [class]="dotClass(option)"
                [class.ring-2]="color() === option"
                [class.ring-offset-2]="color() === option"
                [class.ring-offset-carbon]="color() === option"
                [class.ring-white]="color() === option"
                [attr.aria-label]="'Color ' + option"
                [attr.aria-pressed]="color() === option"
                (click)="color.set(option)"
              ></button>
            }
          </div>
        </div>

        @if (errorMessage()) {
          <p class="text-sm text-rose-300" role="alert">{{ errorMessage() }}</p>
        }

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" appBtn="ghost" (click)="close.emit()">Cancelar</button>
          <button type="submit" appBtn="primary" [disabled]="loading() || form.invalid">
            @if (loading()) {
              <app-spinner [size]="15" label="Creando" />
            } @else {
              <app-icon name="plus" [size]="15" />
              Crear espacio
            }
          </button>
        </div>
      </form>
    </app-modal>
  `
})
export class CreateWorkspaceDialog {
  private readonly service = inject(WorkspacesService);
  private readonly store = inject(WorkspaceStore);
  private readonly toast = inject(ToastService);

  readonly open = input(false);
  readonly close = output<void>();
  readonly created = output<Workspace>();

  protected readonly colors = AVATAR_COLORS;
  protected readonly color = signal<AvatarColor>('indigo');
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: ['']
  });

  protected dotClass(color: AvatarColor): string {
    return WORKSPACE_DOT_CLASSES[color];
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const { name, description } = this.form.getRawValue();

    this.service
      .create({ name, description: description || null, color: this.color() })
      .subscribe({
        next: (workspace) => {
          this.loading.set(false);
          this.form.reset();
          this.store.upsert(workspace);
          this.toast.success(`Espacio "${workspace.name}" creado.`);
          this.created.emit(workspace);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          const body = error.error as ApiErrorBody | null;
          this.errorMessage.set(body?.message ?? 'No se pudo crear el espacio.');
        }
      });
  }
}
