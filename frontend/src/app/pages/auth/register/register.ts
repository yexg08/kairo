import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiErrorBody } from '../../../core/models/common.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Spinner } from '../../../shared/components/spinner/spinner';
import { BtnDirective } from '../../../shared/design/button';
import { AuthShell } from '../auth-shell/auth-shell';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthShell, BtnDirective, Spinner],
  template: `
    <app-auth-shell
      title="Crea tu cuenta"
      subtitle="Vienes con un espacio y un tablero de ejemplo listos."
    >
      <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
        <div>
          <label class="mb-1.5 block text-sm text-mist" for="displayName">Cómo te llamas</label>
          <input
            id="displayName"
            type="text"
            autocomplete="name"
            formControlName="displayName"
            class="h-10 w-full rounded-md bg-obsidian px-3 text-sm text-paper ring-1 ring-graphite
                   transition-shadow placeholder:text-ash focus:outline-none focus:ring-2 focus:ring-iris-500"
            placeholder="Santiago Molina"
          />
          @if (invalid('displayName')) {
            <p class="mt-1.5 text-xs text-rose-300">Escribe tu nombre.</p>
          }
        </div>

        <div>
          <label class="mb-1.5 block text-sm text-mist" for="email">Correo</label>
          <input
            id="email"
            type="email"
            autocomplete="email"
            formControlName="email"
            class="h-10 w-full rounded-md bg-obsidian px-3 text-sm text-paper ring-1 ring-graphite
                   transition-shadow placeholder:text-ash focus:outline-none focus:ring-2 focus:ring-iris-500"
            placeholder="tu@correo.com"
          />
          @if (invalid('email')) {
            <p class="mt-1.5 text-xs text-rose-300">Ese correo no tiene buena pinta.</p>
          }
        </div>

        <div>
          <label class="mb-1.5 block text-sm text-mist" for="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autocomplete="new-password"
            formControlName="password"
            class="h-10 w-full rounded-md bg-obsidian px-3 text-sm text-paper ring-1 ring-graphite
                   transition-shadow placeholder:text-ash focus:outline-none focus:ring-2 focus:ring-iris-500"
            placeholder="Mínimo 6 caracteres"
          />
          @if (invalid('password')) {
            <p class="mt-1.5 text-xs text-rose-300">Necesita al menos 6 caracteres.</p>
          }
        </div>

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
            <app-spinner [size]="16" label="Creando cuenta" />
          } @else {
            Crear cuenta
          }
        </button>
      </form>

      <p authFooter>
        ¿Ya tienes cuenta?
        <a routerLink="/login" class="text-iris-300 transition-colors hover:text-iris-200">
          Entra aquí
        </a>
      </p>
    </app-auth-shell>
  `
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  protected invalid(control: 'displayName' | 'email' | 'password'): boolean {
    const field = this.form.controls[control];
    return field.invalid && field.touched;
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => {
        // Sin auto-login, igual que en la API: la cuenta queda creada y se entra a mano.
        this.toast.success('Cuenta creada. Ya puedes entrar.');
        void this.router.navigate(['/login']);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        const body = error.error as ApiErrorBody | null;
        this.errorMessage.set(
          body?.message ?? body?.errors?.[0] ?? 'No se pudo crear la cuenta. Inténtalo otra vez.'
        );
      }
    });
  }
}
