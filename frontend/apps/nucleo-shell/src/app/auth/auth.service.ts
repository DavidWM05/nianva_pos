import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

import { API_BASE_URL } from '../core/api-config';
import { LoginResponse, TwoFactorConfirmResponse, TwoFactorSetupResponse, Usuario } from './usuario.types';

/**
 * Unico punto de acceso a los endpoints de autenticacion del backend.
 * Sesion por cookie httpOnly + CSRF (Sanctum SPA) -- nunca guarda un
 * token en localStorage/sessionStorage. withCredentials lo agrega
 * credentialsInterceptor en cada request, no hace falta repetirlo aqui.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  /**
   * Sanctum SPA exige pedir la cookie CSRF antes de cualquier POST que
   * cambie estado (login, forgot/reset password) -- si no, el backend
   * rechaza la request por CSRF invalido.
   */
  private ensureCsrfCookie(): Observable<void> {
    return this.http.get<void>(`${API_BASE_URL}/sanctum/csrf-cookie`);
  }

  login(correo: string, password: string): Observable<LoginResponse> {
    return this.ensureCsrfCookie().pipe(
      switchMap(() => this.http.post<LoginResponse>(`${API_BASE_URL}/login`, { correo, password })),
    );
  }

  verifyTwoFactor(code: string): Observable<{ user: Usuario }> {
    return this.http.post<{ user: Usuario }>(`${API_BASE_URL}/login/2fa-verify`, { code });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/logout`, {});
  }

  me(): Observable<Usuario> {
    return this.http.get<Usuario>(`${API_BASE_URL}/api/user`);
  }

  requestPasswordReset(correo: string): Observable<{ status: string }> {
    return this.ensureCsrfCookie().pipe(
      switchMap(() => this.http.post<{ status: string }>(`${API_BASE_URL}/password/forgot`, { correo })),
    );
  }

  resetPassword(payload: {
    correo: string;
    token: string;
    password: string;
    password_confirmation: string;
  }): Observable<{ status: string }> {
    return this.ensureCsrfCookie().pipe(
      switchMap(() => this.http.post<{ status: string }>(`${API_BASE_URL}/password/reset`, payload)),
    );
  }

  getTwoFactorSetup(): Observable<TwoFactorSetupResponse> {
    return this.http.get<TwoFactorSetupResponse>(`${API_BASE_URL}/api/two-factor/qr-code`);
  }

  confirmTwoFactor(code: string): Observable<TwoFactorConfirmResponse> {
    return this.http.post<TwoFactorConfirmResponse>(`${API_BASE_URL}/api/two-factor/confirm`, { code });
  }
}
