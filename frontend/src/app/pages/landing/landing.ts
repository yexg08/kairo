import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarColor } from '../../core/models/common.model';
import { Avatar } from '../../shared/components/avatar/avatar';
import { Logo } from '../../shared/components/logo/logo';
import { BtnDirective } from '../../shared/design/button';
import { RevealDirective } from '../../shared/directives/reveal';
import { SpotlightDirective } from '../../shared/directives/spotlight';
import { TiltDirective } from '../../shared/directives/tilt';
import { IconName } from '../../shared/icons/heroicons';
import { Icon } from '../../shared/icons/icon';

interface DemoViewer {
  id: string;
  displayName: string;
  initials: string;
  avatarColor: AvatarColor;
}

interface DemoCard {
  title: string;
  label?: string;
  meta?: string;
  beingDragged?: boolean;
}

interface DemoColumn {
  name: string;
  cards: DemoCard[];
}

interface Feature {
  icon: IconName;
  title: string;
  description: string;
}

interface ActivityLine {
  id: number;
  author: string;
  color: AvatarColor;
  action: string;
  target: string;
}

const ACTIVITY_INTERVAL_MS = 2200;

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    Avatar,
    Icon,
    Logo,
    BtnDirective,
    RevealDirective,
    SpotlightDirective,
    TiltDirective
  ],
  templateUrl: './landing.html',
  styles: `
    /* La tarjeta que "alguien está agarrando": levantada, girada y con sombra, en bucle. */
    .card-held {
      animation: held 3.4s ease-in-out infinite;
      box-shadow: 0 12px 30px -10px rgb(8 9 10 / 0.9);
      position: relative;
      z-index: 10;
    }

    @keyframes held {
      0%, 100% { transform: rotate(-1.5deg) scale(1.02) translateY(-2px); }
      50% { transform: rotate(1.5deg) scale(1.04) translateY(-6px); }
    }

    /* Marquesina: el contenido se duplica en la plantilla y se desplaza media anchura, así el
       salto al reiniciar cae justo donde empieza la copia y no se ve corte. */
    .marquee {
      animation: marquee 34s linear infinite;
    }

    .marquee:hover {
      animation-play-state: paused;
    }

    @keyframes marquee {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }
  `
})
export class Landing {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly demoViewers: DemoViewer[] = [
    { id: '1', displayName: 'Sofía Ramos', initials: 'SR', avatarColor: 'violet' },
    { id: '2', displayName: 'Diego Peña', initials: 'DP', avatarColor: 'emerald' },
    { id: '3', displayName: 'Mar Ortiz', initials: 'MO', avatarColor: 'sky' }
  ];

  protected readonly demoBoard: DemoColumn[] = [
    {
      name: 'Por hacer',
      cards: [
        { title: 'Definir la paleta del sitio', label: 'bg-violet-500/70', meta: '2/5' },
        { title: 'Copys de la página de precios', label: 'bg-amber-500/70' }
      ]
    },
    {
      name: 'En progreso',
      cards: [
        {
          title: 'Maquetar el hero',
          label: 'bg-sky-500/70',
          meta: '4/6',
          beingDragged: true
        },
        { title: 'Revisar contraste AA', label: 'bg-rose-500/70' }
      ]
    },
    {
      name: 'Hecho',
      cards: [
        { title: 'Auditoría de accesibilidad', label: 'bg-emerald-500/70', meta: '8/8' },
        { title: 'Migrar iconos', label: 'bg-emerald-500/70' }
      ]
    }
  ];

  protected readonly features: Feature[] = [
    {
      icon: 'view-columns',
      title: 'Listas y tarjetas que se arrastran',
      description:
        'Mueve tarjetas entre columnas o reordénalas dentro de una. El orden se guarda al soltar, sin botones de guardar.'
    },
    {
      icon: 'tag',
      title: 'Etiquetas, responsables y fechas',
      description:
        'Cada tarjeta lleva su gente, sus etiquetas de color y su fecha límite, que avisa cuando se acerca o se pasa.'
    },
    {
      icon: 'list-bullet',
      title: 'Checklists con progreso',
      description:
        'Parte una tarea en subtareas y mira subir la barra. El avance se ve desde el tablero, sin abrir la tarjeta.'
    },
    {
      icon: 'chat-bubble-left-ellipsis',
      title: 'Comentarios por tarjeta',
      description:
        'La conversación vive junto al trabajo del que habla, no en un hilo de correo que nadie encuentra.'
    },
    {
      icon: 'funnel',
      title: 'Filtros que no te sacan del tablero',
      description:
        'Filtra por etiqueta, responsable o fecha límite y sigue viendo tus columnas, solo que más cortas.'
    },
    {
      icon: 'bell',
      title: 'Notificaciones donde estás',
      description:
        'Te asignan una tarjeta o comentan en la tuya y te enteras en el momento, con campana y aviso.'
    }
  ];

  protected readonly realtimeBullets: { icon: IconName; title: string; description: string }[] = [
    {
      icon: 'bolt',
      title: 'Cambios al instante',
      description: 'Mover, crear, editar y comentar viaja a todos los que tengan el tablero abierto.'
    },
    {
      icon: 'users',
      title: 'Quién está mirando',
      description: 'Los avatares de arriba dicen quién tiene el tablero abierto en este momento.'
    },
    {
      icon: 'arrow-path',
      title: 'Reconexión sola',
      description: 'Si se cae la red, vuelve a conectarse y se resuscribe a los tableros que tenías.'
    }
  ];

  protected readonly roleChips: { icon: IconName; name: string; can: string }[] = [
    { icon: 'shield-check', name: 'Owner', can: 'manda en el espacio' },
    { icon: 'user-group', name: 'Admin', can: 'gestiona gente y tableros' },
    { icon: 'user-circle', name: 'Member', can: 'trabaja en los tableros' }
  ];

  protected readonly demoMembers: { name: string; email: string; role: string; color: AvatarColor }[] =
    [
      { name: 'Sofía Ramos', email: 'sofia@estudio.com', role: 'Owner', color: 'violet' },
      { name: 'Diego Peña', email: 'diego@estudio.com', role: 'Admin', color: 'emerald' },
      { name: 'Mar Ortiz', email: 'mar@estudio.com', role: 'Member', color: 'sky' }
    ];

  protected readonly marqueePasses = [0, 1];

  protected readonly marqueeTags: { text: string; dot: string }[] = [
    { text: 'Diseño', dot: 'bg-violet-400' },
    { text: 'Desarrollo', dot: 'bg-sky-400' },
    { text: 'Bug', dot: 'bg-rose-400' },
    { text: 'Urgente', dot: 'bg-amber-400' },
    { text: 'Mejora', dot: 'bg-emerald-400' },
    { text: 'Investigación', dot: 'bg-teal-400' },
    { text: 'Contenido', dot: 'bg-fuchsia-400' },
    { text: 'QA', dot: 'bg-indigo-400' }
  ];

  private readonly activityScript: Omit<ActivityLine, 'id'>[] = [
    { author: 'Sofía', color: 'violet', action: 'movió', target: '«Maquetar el hero» a En progreso' },
    { author: 'Diego', color: 'emerald', action: 'comentó en', target: '«Revisar contraste AA»' },
    { author: 'Mar', color: 'sky', action: 'completó', target: '2 subtareas de «Migrar iconos»' },
    { author: 'Sofía', color: 'violet', action: 'asignó a Diego en', target: '«Copys de precios»' },
    { author: 'Diego', color: 'emerald', action: 'creó', target: '«Revisar textos del footer»' }
  ];

  private readonly shownCount = signal(this.prefersReducedMotion ? this.activityScript.length : 1);

  protected readonly visibleActivity = computed<ActivityLine[]>(() =>
    this.activityScript
      .slice(0, this.shownCount())
      .map((line, index) => ({ ...line, id: index }))
      .reverse()
  );

  constructor() {
    // Con movimiento reducido el feed ya se pintó entero de una vez; no hay nada que animar.
    if (this.prefersReducedMotion) return;

    const timer = setInterval(() => {
      this.shownCount.update((count) =>
        count >= this.activityScript.length ? 1 : count + 1
      );
    }, ACTIVITY_INTERVAL_MS);

    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  private get prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
