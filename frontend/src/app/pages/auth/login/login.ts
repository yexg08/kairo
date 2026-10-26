import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiErrorBody } from '../../../core/models/common.model';
import { AuthService } from '../../../core/services/auth.service';
import { Spinner } from '../../../shared/components/spinner/spinner';
import { SwitchToggle } from '../../../shared/components/switch-toggle/switch-toggle';
import { BtnDirective } from '../../../shared/design/button';
import { Icon } from '../../../shared/icons/icon';
import { AuthShell } from '../auth-shell/auth-shell';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShell, BtnDirective, Icon, Spinner, SwitchToggle],
  template: `
    <app-auth-shell
      title="Entra a Kairo"
      subtitle="Retoma tus tableros donde los dejaste."
    >
      <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
        <div>
          <label class="mb-1.5 block text-sm text-mist" for="emailOrUsername">Correo</label>
          <input
            id="emailOrUsername"
            type="text"
            autocomplete="username"
            formControlName="emailOrUsername"
            class="h-10 w-full rounded-md bg-obsidian px-3 text-sm text-paper ring-1 ring-graphite
                   transition-shadow placeholder:text-ash focus:outline-none focus:ring-2 focus:ring-iris-500"
            placeholder="tu@correo.com"
          />
        </div>

        <div>
          <label class="mb-1.5 block text-sm text-mist" for="password">Contraseña</label>
          <div class="relative">
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              autocomplete="current-password"
              formControlName="password"
              class="h-10 w-full rounded-md bg-obsidian px-3 pr-10 text-sm text-paper ring-1 ring-graphite
                     transition-shadow placeholder:text-ash focus:outline-none focus:ring-2 focus:ring-iris-500"
              placeholder="••••••••"
            />
            <button
              type="button"
              class="absolute right-1 top-1 rounded-md p-2 text-ash transition-colors hover:text-mist"
              [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              (click)="showPassword.set(!showPassword())"
            >
              <app-icon name="eye" [size]="16" />
            </button>
          </div>
        </div>

        <label class="flex cursor-pointer items-center gap-2.5 pt-1">
          <app-switch-toggle
            label="Mantener sesión iniciada"
            [checked]="rememberMe()"
            (toggled)="rememberMe.set($event)"
          />
          <span class="text-sm text-fog">Mantener sesión iniciada</span>
        </label>

        @if (errorMessage()) {
          <p
            class="rounded-md bg-signal-danger/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-500/20"
            role="alert"
          >
            {{ errorMessage() }}
          </p>
        }

        <button
          type="submit"
          appBtn="primary"
          size="lg"
          class="w-full"
          [disabled]="loading() || form.invalid"
        >
          @if (loading()) {
            <app-spinner [size]="16" label="Entrando" />
          } @else {
            Entrar
          }
        </button>
      </form>

      <p authFooter>
        ¿No tienes cuenta?
        <a routerLink="/register" class="text-iris-300 transition-colors hover:text-iris-200">
          Créala aquí
        </a>
      </p>
    </app-auth-shell>
  `
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly showPassword = signal(false);
  protected readonly rememberMe = signal(true);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    emailOrUsername: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set('');

    this.auth
      .login({ ...this.form.getRawValue(), rememberMe: this.rememberMe() })
      .subscribe({
        next: () => {
          // Si el guard nos mandó aquí, se vuelve a donde iba; si no, al dashboard.
          const redirect = this.route.snapshot.queryParamMap.get('redirect');
          void this.router.navigateByUrl(redirect ?? '/app');
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          const body = error.error as ApiErrorBody | null;
          this.errorMessage.set(body?.message ?? 'No se pudo entrar. Inténtalo otra vez.');
        }
      });
  }
}
