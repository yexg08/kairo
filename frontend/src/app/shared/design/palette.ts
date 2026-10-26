import { AvatarColor, BoardBackground, LabelColor } from '../../core/models/common.model';

/*
  Los tokens de color que guarda el backend se traducen aquí a clases de Tailwind.

  Las clases están escritas enteras a propósito: Tailwind rastrea el código fuente buscando
  nombres de clase literales, así que algo como `bg-${color}-500` se compilaría a nada.
*/

export const AVATAR_CLASSES: Record<AvatarColor, string> = {
  indigo: 'bg-indigo-500/15 text-indigo-200 ring-indigo-400/25',
  violet: 'bg-violet-500/15 text-violet-200 ring-violet-400/25',
  sky: 'bg-sky-500/15 text-sky-200 ring-sky-400/25',
  emerald: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/25',
  amber: 'bg-amber-500/15 text-amber-200 ring-amber-400/25',
  rose: 'bg-rose-500/15 text-rose-200 ring-rose-400/25',
  teal: 'bg-teal-500/15 text-teal-200 ring-teal-400/25',
  fuchsia: 'bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-400/25'
};

export interface LabelStyle {
  /** Píldora con texto, dentro de la tarjeta abierta y en los filtros. */
  chip: string;
  /** Barra compacta de la miniatura, donde no cabe el nombre. */
  bar: string;
  /** Punto sólido para menús y leyendas. */
  dot: string;
}

export const LABEL_CLASSES: Record<LabelColor, LabelStyle> = {
  violet: {
    chip: 'bg-violet-500/15 text-violet-200 ring-violet-400/30',
    bar: 'bg-violet-500/70',
    dot: 'bg-violet-400'
  },
  sky: {
    chip: 'bg-sky-500/15 text-sky-200 ring-sky-400/30',
    bar: 'bg-sky-500/70',
    dot: 'bg-sky-400'
  },
  emerald: {
    chip: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
    bar: 'bg-emerald-500/70',
    dot: 'bg-emerald-400'
  },
  amber: {
    chip: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
    bar: 'bg-amber-500/70',
    dot: 'bg-amber-400'
  },
  rose: {
    chip: 'bg-rose-500/15 text-rose-200 ring-rose-400/30',
    bar: 'bg-rose-500/70',
    dot: 'bg-rose-400'
  },
  teal: {
    chip: 'bg-teal-500/15 text-teal-200 ring-teal-400/30',
    bar: 'bg-teal-500/70',
    dot: 'bg-teal-400'
  },
  fuchsia: {
    chip: 'bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-400/30',
    bar: 'bg-fuchsia-500/70',
    dot: 'bg-fuchsia-400'
  },
  indigo: {
    chip: 'bg-indigo-500/15 text-indigo-200 ring-indigo-400/30',
    bar: 'bg-indigo-500/70',
    dot: 'bg-indigo-400'
  },
  slate: {
    chip: 'bg-slate-500/15 text-slate-200 ring-slate-400/30',
    bar: 'bg-slate-500/70',
    dot: 'bg-slate-400'
  }
};

export interface BoardBackgroundStyle {
  label: string;
  /** Fondo a pantalla completa del tablero. */
  surface: string;
  /** Miniatura de las tarjetas de tablero en el dashboard. */
  thumb: string;
}

/*
  Degradados radiales que arrancan de un color saturado arriba y mueren en el negro de la
  página. Así el tablero tiene identidad sin que las columnas pierdan contraste: donde va el
  contenido, el fondo ya es prácticamente #08090a.
*/
export const BOARD_BACKGROUND_CLASSES: Record<BoardBackground, BoardBackgroundStyle> = {
  aurora: {
    label: 'Aurora',
    surface: 'bg-[radial-gradient(120%_110%_at_15%_0%,#4a2ea8_0%,#1b1440_38%,#08090a_82%)]',
    thumb: 'bg-[radial-gradient(120%_140%_at_20%_0%,#6d4ae0_0%,#241a58_55%,#0f1011_100%)]'
  },
  midnight: {
    label: 'Medianoche',
    surface: 'bg-[radial-gradient(120%_110%_at_85%_0%,#123b5e_0%,#0d1b2e_38%,#08090a_82%)]',
    thumb: 'bg-[radial-gradient(120%_140%_at_80%_0%,#1d6291_0%,#102439_55%,#0f1011_100%)]'
  },
  ember: {
    label: 'Brasa',
    surface: 'bg-[radial-gradient(120%_110%_at_20%_0%,#7a2b1e_0%,#2a1210_38%,#08090a_82%)]',
    thumb: 'bg-[radial-gradient(120%_140%_at_20%_0%,#a83c28_0%,#341614_55%,#0f1011_100%)]'
  },
  forest: {
    label: 'Bosque',
    surface: 'bg-[radial-gradient(120%_110%_at_80%_0%,#14532d_0%,#0c2318_38%,#08090a_82%)]',
    thumb: 'bg-[radial-gradient(120%_140%_at_80%_0%,#1d7a43_0%,#0f2c1e_55%,#0f1011_100%)]'
  },
  ocean: {
    label: 'Océano',
    surface: 'bg-[radial-gradient(120%_110%_at_50%_0%,#0e5a63_0%,#082b31_38%,#08090a_82%)]',
    thumb: 'bg-[radial-gradient(120%_140%_at_50%_0%,#14818e_0%,#0b363d_55%,#0f1011_100%)]'
  },
  plum: {
    label: 'Ciruela',
    surface: 'bg-[radial-gradient(120%_110%_at_25%_0%,#5b1d52_0%,#25102a_38%,#08090a_82%)]',
    thumb: 'bg-[radial-gradient(120%_140%_at_25%_0%,#822a75_0%,#2e1435_55%,#0f1011_100%)]'
  }
};

export const WORKSPACE_DOT_CLASSES: Record<AvatarColor, string> = {
  indigo: 'bg-indigo-400',
  violet: 'bg-violet-400',
  sky: 'bg-sky-400',
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
  teal: 'bg-teal-400',
  fuchsia: 'bg-fuchsia-400'
};
