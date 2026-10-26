import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from '../../../shared/components/logo/logo';

@Component({
  selector: 'app-auth-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Logo],
  template: `
    <div class="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-12">
      <div class="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          class="animate-aurora absolute -top-1/3 left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full
                 bg-[radial-gradient(circle,rgba(123,92,255,0.28)_0%,transparent_62%)] blur-3xl"
        ></div>
      </div>

      <div class="relative w-full max-w-sm">
        <a routerLink="/" class="mb-8 flex justify-center" aria-label="Kairo, inicio">
          <app-logo [size]="32" />
        </a>

        <div class="rounded-xl bg-carbon/80 p-6 shadow-lifted ring-1 ring-graphite backdrop-blur-xl">
          <h1 class="text-xl font-medium text-paper">{{ title() }}</h1>
          <p class="mt-1.5 text-sm text-fog">{{ subtitle() }}</p>

          <div class="mt-6">
            <ng-content />
          </div>
        </div>

        <div class="mt-6 text-center text-sm text-ash">
          <ng-content select="[authFooter]" />
        </div>
      </div>
    </div>
  `
})
export class AuthShell {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
}
