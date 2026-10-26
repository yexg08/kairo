export type DueState = 'none' | 'done' | 'overdue' | 'today' | 'soon' | 'later';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Estado de una fecha límite. Se resuelve en un solo sitio porque el mismo criterio decide
 * el color de la píldora en la miniatura, en la tarjeta abierta y en el dashboard.
 */
export function dueState(dueDate: string | null, isCompleted = false): DueState {
  if (!dueDate) return 'none';
  if (isCompleted) return 'done';

  const due = new Date(dueDate).getTime();
  const now = Date.now();

  if (due < now) return 'overdue';

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  if (due <= endOfToday.getTime()) return 'today';
  if (due - now <= 3 * DAY_MS) return 'soon';

  return 'later';
}

export const DUE_STATE_CLASSES: Record<DueState, string> = {
  none: '',
  done: 'bg-signal-success/15 text-emerald-300 ring-emerald-400/25',
  overdue: 'bg-signal-danger/15 text-rose-300 ring-rose-400/30',
  today: 'bg-signal-warn/15 text-amber-200 ring-amber-400/30',
  soon: 'bg-signal-warn/10 text-amber-200/90 ring-amber-400/20',
  later: 'bg-obsidian text-fog ring-graphite'
};

/** "12 mar", o "12 mar 2025" si cae en otro año. */
export function formatDueDate(iso: string): string {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();

  return date.toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' })
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/** "hace 5 min", "ayer", "hace 3 sem"… para el feed de actividad y los comentarios. */
export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);

  if (minutes < 1) return 'ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;

  const weeks = Math.round(days / 7);
  if (weeks < 5) return `hace ${weeks} sem`;

  const months = Math.round(days / 30);
  if (months < 12) return `hace ${months} meses`;

  return `hace ${Math.round(days / 365)} años`;
}

/**
 * Fecha lista para un `<input type="datetime-local">`, que espera hora local sin zona
 * mientras la API trabaja en UTC.
 */
export function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';

  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function fromLocalInputValue(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
