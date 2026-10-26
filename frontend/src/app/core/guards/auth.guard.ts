import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  // Se guarda a dónde iba para devolverlo ahí después de entrar.
  return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};

/** Evita que alguien con sesión abierta aterrice otra vez en login o registro. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? router.createUrlTree(['/app']) : true;
};
