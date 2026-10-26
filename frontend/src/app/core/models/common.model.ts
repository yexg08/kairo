export interface UserSummary {
  id: string;
  displayName: string;
  email: string | null;
  avatarColor: AvatarColor;
  initials: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Los colores viajan como token, no como hex: el backend no sabe nada de la paleta y el
 * front decide cómo se pinta cada uno. Las uniones de aquí son el contrato entre ambos.
 */
export const AVATAR_COLORS = [
  'indigo',
  'violet',
  'sky',
  'emerald',
  'amber',
  'rose',
  'teal',
  'fuchsia'
] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const LABEL_COLORS = [
  'violet',
  'sky',
  'emerald',
  'amber',
  'rose',
  'teal',
  'fuchsia',
  'indigo',
  'slate'
] as const;
export type LabelColor = (typeof LABEL_COLORS)[number];

export const BOARD_BACKGROUNDS = [
  'aurora',
  'midnight',
  'ember',
  'forest',
  'ocean',
  'plum'
] as const;
export type BoardBackground = (typeof BOARD_BACKGROUNDS)[number];

export interface ApiErrorBody {
  message?: string;
  errors?: string[];
}
