import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/**
 * Traduce los fallos que no tiene sentido manejar en cada pantalla:
 * la sesión caducada y el servidor caído. El resto (400, 404, 409…) se deja pasar para que
 * cada formulario los cuente a su manera, que es donde el mensaje tiene contexto.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isLoginAttempt = req.url.includes('/auth/login');

      if (error.status === 401 && !isLoginAttempt && auth.isAuthenticated()) {
        auth.logout();
        toast.info('Tu sesión caducó. Entra de nuevo.');
        void router.navigate(['/login']);
      }

      // status 0 = ni siquiera hubo respuesta: la API no está levantada o CORS la bloqueó.
      if (error.status === 0) {
        toast.error('No hay conexión con el servidor de Kairo.');
      }

      if (error.status >= 500) {
        toast.error('El servidor tuvo un problema. Inténtalo otra vez.');
      }

      return throwError(() => error);
    })
  );
};
