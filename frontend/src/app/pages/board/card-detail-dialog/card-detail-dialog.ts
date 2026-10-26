import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { Card, Label } from '../../../core/models/board.model';
import { CardDetail, ChecklistItem, Comment } from '../../../core/models/card.model';
import { LABEL_COLORS, LabelColor } from '../../../core/models/common.model';
import { WorkspaceMember } from '../../../core/models/workspace.model';
import { AuthService } from '../../../core/services/auth.service';
import { CardsService } from '../../../core/services/cards.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { ToastService } from '../../../core/services/toast.service';
import { fromLocalInputValue, relativeTime, toLocalInputValue } from '../../../core/utils/dates';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { CheckBox } from '../../../shared/components/check-box/check-box';
import { LabelChip } from '../../../shared/components/label-chip/label-chip';
import { Modal } from '../../../shared/components/modal/modal';
import { ProgressBar } from '../../../shared/components/progress-bar/progress-bar';
import { Spinner } from '../../../shared/components/spinner/spinner';
import { BtnDirective } from '../../../shared/design/button';
import { LABEL_CLASSES } from '../../../shared/design/palette';
import { Icon } from '../../../shared/icons/icon';

@Component({
  selector: 'app-card-detail-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Avatar,
    CheckBox,
    Icon,
    LabelChip,
    Modal,
    ProgressBar,
    Spinner,
    BtnDirective
  ],
  templateUrl: './card-detail-dialog.html'
})
export class CardDetailDialog {
  private readonly service = inject(CardsService);
  private readonly realtime = inject(RealtimeService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cardId = input<string | null>(null);
  readonly labels = input<Label[]>([]);
  readonly members = input<WorkspaceMember[]>([]);

  readonly close = output<void>();
  /** Cada cambio se devuelve al tablero para que la miniatura no se quede desfasada. */
  readonly cardChanged = output<Card>();
  readonly cardRemoved = output<string>();

  private readonly descriptionInput = viewChild<ElementRef<HTMLTextAreaElement>>('descriptionInput');
  private readonly checklistInput = viewChild<ElementRef<HTMLInputElement>>('checklistInput');
  private readonly commentInput = viewChild<ElementRef<HTMLTextAreaElement>>('commentInput');
  private readonly editCommentInput = viewChild<ElementRef<HTMLTextAreaElement>>('editCommentInput');
  private readonly dueInput = viewChild<ElementRef<HTMLInputElement>>('dueInput');

  protected readonly card = signal<CardDetail | null>(null);
  protected readonly loading = signal(false);
  protected readonly descriptionDirty = signal(false);
  protected readonly commentDirty = signal(false);
  protected readonly editingCommentId = signal<string | null>(null);

  protected readonly coverColors = LABEL_COLORS;
  protected readonly currentUser = this.auth.currentUser;
  protected readonly open = computed(() => this.cardId() !== null);
  protected readonly dueValue = computed(() => toLocalInputValue(this.card()?.dueDate ?? null));

  constructor() {
    effect(() => {
      const id = this.cardId();

      if (!id) {
        this.card.set(null);
        return;
      }

      this.loadCard(id);
    });

    this.listenRealtime();
  }

  // ─────────────────────────── Carga y tiempo real ───────────────────────────

  private loadCard(id: string): void {
    this.loading.set(true);
    this.descriptionDirty.set(false);
    this.commentDirty.set(false);
    this.editingCommentId.set(null);

    this.service.getById(id).subscribe({
      next: (detail) => {
        this.card.set(detail);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('No se pudo abrir la tarjeta.');
        this.close.emit();
      }
    });
  }

  /**
   * Mientras la tarjeta está abierta, lo que otros hagan sobre ella entra por aquí. Se filtra
   * por id porque el hub emite lo de todo el tablero, no solo lo de esta tarjeta.
   */
  private listenRealtime(): void {
    const unsubscribers = [
      this.realtime.on('ChecklistChanged', (event) => {
        this.patchIfCurrent(event.cardId, (detail) => ({
          ...detail,
          checklistItems: event.items,
          checklistTotal: event.total,
          checklistDone: event.done
        }));
      }),

      this.realtime.on('CommentAdded', (comment) => {
        this.patchIfCurrent(comment.cardId, (detail) =>
          detail.comments.some((item) => item.id === comment.id)
            ? detail
            : { ...detail, comments: [comment, ...detail.comments], commentCount: detail.commentCount + 1 }
        );
      }),

      this.realtime.on('CommentUpdated', (comment) => {
        this.patchIfCurrent(comment.cardId, (detail) => ({
          ...detail,
          comments: detail.comments.map((item) => (item.id === comment.id ? comment : item))
        }));
      }),

      this.realtime.on('CommentDeleted', (event) => {
        this.patchIfCurrent(event.cardId, (detail) => ({
          ...detail,
          comments: detail.comments.filter((item) => item.id !== event.commentId),
          commentCount: event.commentCount
        }));
      }),

      this.realtime.on('CardUpdated', (card) => {
        this.patchIfCurrent(card.id, (detail) => ({
          ...detail,
          ...card,
          // La descripción y los comentarios no vienen en el resumen que manda el tablero.
          description: detail.description,
          comments: detail.comments,
          checklistItems: detail.checklistItems
        }));
      })
    ];

    this.destroyRef.onDestroy(() => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    });
  }

  private patchIfCurrent(cardId: string, patch: (detail: CardDetail) => CardDetail): void {
    this.card.update((detail) => (detail && detail.id === cardId ? patch(detail) : detail));
  }

  private apply(card: Card): void {
    this.card.update((detail) => (detail ? { ...detail, ...card } : detail));
    this.cardChanged.emit(card);
  }

  // ─────────────────────────── Campos de la tarjeta ───────────────────────────

  protected saveTitle(event: Event): void {
    event.preventDefault();

    const detail = this.card();
    const title = (event.target as HTMLTextAreaElement).value.trim();

    if (!detail || !title || title === detail.title) return;

    this.update({ ...detail, title });
  }

  protected saveDescription(): void {
    const detail = this.card();
    const description = this.descriptionInput()?.nativeElement.value.trim() ?? '';

    if (!detail) return;

    this.descriptionDirty.set(false);
    this.update({ ...detail, description: description || null });
  }

  protected resetDescription(): void {
    const input = this.descriptionInput()?.nativeElement;
    if (input) input.value = this.card()?.description ?? '';

    this.descriptionDirty.set(false);
  }

  protected saveDueDate(): void {
    const detail = this.card();
    const value = this.dueInput()?.nativeElement.value ?? '';

    if (!detail) return;

    this.update({ ...detail, dueDate: fromLocalInputValue(value) });
  }

  protected toggleCompleted(isCompleted: boolean): void {
    const detail = this.card();
    if (!detail) return;

    this.update({ ...detail, isCompleted });
  }

  protected setCover(coverColor: LabelColor | null): void {
    const detail = this.card();
    if (!detail) return;

    this.update({ ...detail, coverColor });
  }

  private update(detail: CardDetail): void {
    // Se pinta ya y se confirma después: escribir un título y esperar al servidor para verlo
    // se siente roto.
    this.card.set(detail);

    this.service
      .update(detail.id, {
        title: detail.title,
        description: detail.description,
        dueDate: detail.dueDate,
        isCompleted: detail.isCompleted,
        coverColor: detail.coverColor
      })
      .subscribe({
        next: (card) => this.apply(card),
        error: () => {
          this.toast.error('No se pudo guardar el cambio.');
          this.loadCard(detail.id);
        }
      });
  }

  // ─────────────────────────── Etiquetas y responsables ───────────────────────────

  protected hasLabel(labelId: string): boolean {
    return this.card()?.labels.some((label) => label.id === labelId) ?? false;
  }

  protected toggleLabel(labelId: string): void {
    const detail = this.card();
    if (!detail) return;

    const request = this.hasLabel(labelId)
      ? this.service.removeLabel(detail.id, labelId)
      : this.service.addLabel(detail.id, labelId);

    request.subscribe({
      next: (card) => this.apply(card),
      error: () => this.toast.error('No se pudo cambiar la etiqueta.')
    });
  }

  protected isAssigned(userId: string): boolean {
    return this.card()?.assignees.some((user) => user.id === userId) ?? false;
  }

  protected toggleAssignee(userId: string): void {
    const detail = this.card();
    if (!detail) return;

    const request = this.isAssigned(userId)
      ? this.service.removeAssignee(detail.id, userId)
      : this.service.addAssignee(detail.id, { userId });

    request.subscribe({
      next: (card) => this.apply(card),
      error: () => this.toast.error('No se pudo cambiar el responsable.')
    });
  }

  protected coverClass(color: LabelColor): string {
    return LABEL_CLASSES[color].bar;
  }

  // ─────────────────────────── Checklist ───────────────────────────

  protected addChecklistItem(): void {
    const detail = this.card();
    const input = this.checklistInput()?.nativeElement;
    const text = input?.value.trim() ?? '';

    if (!detail || !text) return;

    if (input) input.value = '';

    this.service.addChecklistItem(detail.id, { text }).subscribe({
      // El estado real llega por ChecklistChanged, que trae la lista completa y los contadores.
      error: () => this.toast.error('No se pudo añadir la subtarea.')
    });
  }

  protected toggleChecklistItem(item: ChecklistItem, isCompleted: boolean): void {
    this.patchIfCurrent(item.cardId, (detail) => ({
      ...detail,
      checklistItems: detail.checklistItems.map((current) =>
        current.id === item.id ? { ...current, isCompleted } : current
      ),
      checklistDone: detail.checklistDone + (isCompleted ? 1 : -1)
    }));

    this.service.updateChecklistItem(item.id, { text: item.text, isCompleted }).subscribe({
      error: () => {
        this.toast.error('No se pudo actualizar la subtarea.');
        this.loadCard(item.cardId);
      }
    });
  }

  protected removeChecklistItem(itemId: string): void {
    this.service.removeChecklistItem(itemId).subscribe({
      error: () => this.toast.error('No se pudo eliminar la subtarea.')
    });
  }

  // ─────────────────────────── Comentarios ───────────────────────────

  protected onCommentInput(event: Event): void {
    this.commentDirty.set((event.target as HTMLTextAreaElement).value.trim().length > 0);
  }

  protected addComment(): void {
    const detail = this.card();
    const input = this.commentInput()?.nativeElement;
    const text = input?.value.trim() ?? '';

    if (!detail || !text) return;

    if (input) input.value = '';
    this.commentDirty.set(false);

    this.service.addComment(detail.id, { text }).subscribe({
      next: (comment) => {
        this.patchIfCurrent(detail.id, (current) =>
          current.comments.some((item) => item.id === comment.id)
            ? current
            : {
                ...current,
                comments: [comment, ...current.comments],
                commentCount: current.commentCount + 1
              }
        );
      },
      error: () => this.toast.error('No se pudo publicar el comentario.')
    });
  }

  protected canEditComment(comment: Comment): boolean {
    return comment.author.id === this.currentUser()?.id;
  }

  protected startEditComment(commentId: string): void {
    this.editingCommentId.set(commentId);
    queueMicrotask(() => this.editCommentInput()?.nativeElement.focus());
  }

  protected saveComment(commentId: string): void {
    const text = this.editCommentInput()?.nativeElement.value.trim() ?? '';
    this.editingCommentId.set(null);

    if (!text) return;

    this.service.updateComment(commentId, { text }).subscribe({
      next: (comment) => {
        this.patchIfCurrent(comment.cardId, (detail) => ({
          ...detail,
          comments: detail.comments.map((item) => (item.id === comment.id ? comment : item))
        }));
      },
      error: () => this.toast.error('No se pudo editar el comentario.')
    });
  }

  protected removeComment(commentId: string): void {
    const detail = this.card();
    if (!detail) return;

    this.service.removeComment(commentId).subscribe({
      next: () => {
        this.patchIfCurrent(detail.id, (current) => ({
          ...current,
          comments: current.comments.filter((item) => item.id !== commentId),
          commentCount: Math.max(0, current.commentCount - 1)
        }));
      },
      error: () => this.toast.error('No se pudo borrar el comentario.')
    });
  }

  protected time(iso: string): string {
    return relativeTime(iso);
  }

  // ─────────────────────────── Acciones destructivas ───────────────────────────

  protected async archive(): Promise<void> {
    const detail = this.card();
    if (!detail) return;

    const confirmed = await this.confirm.ask({
      title: '¿Archivar la tarjeta?',
      message: 'Desaparece del tablero, pero se queda guardada.',
      confirmLabel: 'Archivar'
    });

    if (!confirmed) return;

    this.service.setArchived(detail.id, { isArchived: true }).subscribe({
      next: () => {
        this.cardRemoved.emit(detail.id);
        this.close.emit();
      },
      error: () => this.toast.error('No se pudo archivar la tarjeta.')
    });
  }

  protected async remove(): Promise<void> {
    const detail = this.card();
    if (!detail) return;

    const confirmed = await this.confirm.ask({
      title: `¿Eliminar «${detail.title}»?`,
      message: 'Se borra con sus subtareas y comentarios. No se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true
    });

    if (!confirmed) return;

    this.service.remove(detail.id).subscribe({
      next: () => {
        this.cardRemoved.emit(detail.id);
        this.close.emit();
      },
      error: () => this.toast.error('No se pudo eliminar la tarjeta.')
    });
  }
}
