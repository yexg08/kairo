import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BoardDetail } from '../../../core/models/board.model';
import { BOARD_BACKGROUNDS, ApiErrorBody, BoardBackground } from '../../../core/models/common.model';
import { BoardsService } from '../../../core/services/boards.service';
import { ToastService } from '../../../core/services/toast.service';
import { WorkspaceStore } from '../../../core/state/workspace-store';
import { BtnDirective } from '../../design/button';
import { BOARD_BACKGROUND_CLASSES } from '../../design/palette';
import { Icon } from '../../icons/icon';
import { Modal } from '../modal/modal';
import { Spinner } from '../spinner/spinner';
import { SwitchToggle } from '../switch-toggle/switch-toggle';

@Component({
  selector: 'app-create-board-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BtnDirective, Icon, Modal, Spinner, SwitchToggle],
  template: `
    <app-modal
      title="Nuevo tablero"
      [open]="open()"
      (close)="close.emit()"
    >
      <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-sm text-mist" for="board-name">Nombre</label>
            <input
              id="board-name"
              type="text"
              formControlName="name"
              class="h-10 w-full rounded-md bg-obsidian px-3 text-sm text-paper ring-1 ring-graphite
                     placeholder:text-ash focus:outline-none focus:ring-2 focus:ring-iris-500"
              placeholder="Rediseño del sitio"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm text-mist" for="board-workspace">Espacio</label>
            <select
              id="board-workspace"
              formControlName="workspaceId"
              class="h-10 w-full rounded-md bg-obsidian px-3 text-sm text-paper ring-1 ring-graphite
                     focus:outline-none focus:ring-2 focus:ring-iris-500"
            >
              @for (workspace of workspaces(); track workspace.id) {
                <option [value]="workspace.id">{{ workspace.name }}</option>
              }
            </select>
          </div>
        </div>

        <div>
          <span class="mb-2 block text-sm text-mist">Fondo</span>
          <div class="grid grid-cols-3 gap-2 sm:grid-cols-6">
            @for (option of backgrounds; track option) {
              <button
                type="button"
                class="group relative h-14 overflow-hidden rounded-md ring-1 transition-all duration-150"
                [class]="thumbClass(option)"
                [class.ring-iris-400]="background() === option"
                [class.ring-graphite]="background() !== option"
                [attr.aria-label]="'Fondo ' + backgroundLabel(option)"
                [attr.aria-pressed]="background() === option"
                (click)="background.set(option)"
              >
                @if (background() === option) {
                  <span
                    class="absolute inset-0 flex items-center justify-center bg-void/30 text-white"
                  >
                    <app-icon name="check" [size]="16" [strokeWidth]="2" />
                  </span>
                }
              </button>
            }
          </div>
        </div>

        <label class="flex items-center gap-3 rounded-md bg-obsidian/60 p-3 ring-1 ring-graphite">
          <app-switch-toggle
            label="Empezar con columnas y etiquetas"
            [checked]="useTemplate()"
            (toggled)="useTemplate.set($event)"
          />
          <span class="text-sm text-fog">
            Empezar con
            <span class="text-mist">Por hacer / En progreso / En revisión / Hecho</span>
            y un juego de etiquetas
          </span>
        </label>

        @if (errorMessage()) {
          <p class="text-sm text-rose-300" role="alert">{{ errorMessage() }}</p>
        }

        <div class="flex justify-end gap-2 pt-1">
          <button type="button" appBtn="ghost" (click)="close.emit()">Cancelar</button>
          <button type="submit" appBtn="primary" [disabled]="loading() || form.invalid">
            @if (loading()) {
              <app-spinner [size]="15" label="Creando" />
            } @else {
              <app-icon name="plus" [size]="15" />
              Crear tablero
            }
          </button>
        </div>
      </form>
    </app-modal>
  `
})
export class CreateBoardDialog {
  private readonly service = inject(BoardsService);
  private readonly store = inject(WorkspaceStore);
  private readonly toast = inject(ToastService);

  readonly open = input(false);
  /** Espacio que llega preseleccionado cuando se abre desde dentro de uno. */
  readonly workspaceId = input<string | null>(null);

  readonly close = output<void>();
  readonly created = output<BoardDetail>();

  protected readonly workspaces = this.store.workspaces;
  protected readonly backgrounds = BOARD_BACKGROUNDS;
  protected readonly background = signal<BoardBackground>('aurora');
  protected readonly useTemplate = signal(true);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    workspaceId: ['', [Validators.required]]
  });

  constructor() {
    // El espacio por defecto es aquel desde el que se abrió; si se abre desde el dashboard,
    // el primero de la lista.
    effect(() => {
      const preselected = this.workspaceId() ?? this.workspaces()[0]?.id ?? '';
      if (preselected && !this.form.controls.workspaceId.value) {
        this.form.controls.workspaceId.setValue(preselected);
      }
    });
  }

  protected thumbClass(background: BoardBackground): string {
    return BOARD_BACKGROUND_CLASSES[background].thumb;
  }

  protected backgroundLabel(background: BoardBackground): string {
    return BOARD_BACKGROUND_CLASSES[background].label;
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const { name, workspaceId } = this.form.getRawValue();

    this.service
      .create({
        workspaceId,
        name,
        description: null,
        background: this.background(),
        useStarterTemplate: this.useTemplate()
      })
      .subscribe({
        next: (board) => {
          this.loading.set(false);
          this.form.controls.name.reset('');
          this.store.load(true);
          this.toast.success(`Tablero "${board.name}" creado.`);
          this.created.emit(board);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          const body = error.error as ApiErrorBody | null;
          this.errorMessage.set(body?.message ?? 'No se pudo crear el tablero.');
        }
      });
  }
}
