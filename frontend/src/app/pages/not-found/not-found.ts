import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from '../../shared/components/logo/logo';
import { BtnDirective } from '../../shared/design/button';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Logo, BtnDirective],
  template: `
    <div class="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <app-logo [size]="36" [showName]="false" />
      <p class="mt-8 text-sm text-iris-300">Error 404</p>
      <h1 class="mt-3 text-3xl sm:text-title">Esta página no existe</h1>
      <p class="mt-3 max-w-sm text-sm leading-relaxed text-fog">
        Puede que el tablero se haya movido, se haya eliminado o que el enlace esté mal escrito.
      </p>
      <a routerLink="/app" appBtn="primary" size="lg" class="mt-8">Ir a mis tableros</a>
    </div>
  `
})
export class NotFound {}
