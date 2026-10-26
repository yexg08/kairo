import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

/**
 * Todo va en carga diferida: la landing pública no tiene por qué arrastrar el tablero, el
 * CDK de arrastre ni el cliente de SignalR para enseñar una página de marketing.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing').then((m) => m.Landing),
    title: 'Kairo · Tableros que se mueven contigo'
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/login/login').then((m) => m.Login),
    title: 'Entrar · Kairo'
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/register/register').then((m) => m.Register),
    title: 'Crear cuenta · Kairo'
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
        title: 'Inicio · Kairo'
      },
      {
        path: 'w/:workspaceId',
        loadComponent: () => import('./pages/workspace/workspace').then((m) => m.Workspace),
        title: 'Espacio · Kairo'
      },
      {
        path: 'w/:workspaceId/settings',
        loadComponent: () =>
          import('./pages/workspace-settings/workspace-settings').then((m) => m.WorkspaceSettings),
        title: 'Configuración del espacio · Kairo'
      },
      {
        path: 'b/:boardId',
        loadComponent: () => import('./pages/board/board').then((m) => m.Board),
        title: 'Tablero · Kairo'
      }
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
    title: 'Página no encontrada · Kairo'
  }
];
