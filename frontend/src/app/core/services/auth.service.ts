import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  UpdateProfileRequest
} from '../models/auth.model';
import { UserSummary } from '../models/common.model';

const STORAGE_KEY = 'kairo.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = signal<AuthResponse | null>(this.readStoredSession());

  readonly currentUser = computed<UserSummary | null>(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);

  register(request: RegisterRequest): Observable<RegisterResponse> {
    // Sin auto-login: la cuenta se crea y el usuario entra explícitamente después.
    return this.http.post<RegisterResponse>(`${API_BASE_URL}/auth/register`, request);
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${API_BASE_URL}/auth/login`, request)
      .pipe(tap((response) => this.setSession(response)));
  }

  updateProfile(request: UpdateProfileRequest): Observable<UserSummary> {
    return this.http
      .put<UserSummary>(`${API_BASE_URL}/auth/me`, request)
      .pipe(tap((user) => this.patchUser(user)));
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
  }

  getToken(): string | null {
    return this.session()?.token ?? null;
  }

  private setSession(response: AuthResponse): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
    this.session.set(response);
  }

  private patchUser(user: UserSummary): void {
    const current = this.session();
    if (!current) return;

    this.setSession({ ...current, user });
  }

  private readStoredSession(): AuthResponse | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as AuthResponse;

      // Un token caducado en localStorage solo sirve para provocar un 401 en la primera
      // petición; mejor tratarlo como sesión inexistente desde el arranque.
      if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return parsed;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}
