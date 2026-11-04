import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { RespuestaDe } from '@nianva/api-contrato';
import { Observable, map, switchMap, tap } from 'rxjs';

import { urlApi, urlSesion } from '../core/api-config';
import { ERROR_EN_PANTALLA } from '../core/errores.interceptor';
import { Sesion } from './sesion.types';
import { LoginResponse, TwoFactorConfirmResponse, TwoFactorSetupResponse, Usuario } from './usuario.types';
import { SesionEntrePestanasService } from './sesion-entre-pestanas.service';

/**
 * Unico punto de acceso a los endpoints de autenticacion del backend.
 * Sesion por cookie httpOnly + CSRF (Sanctum SPA) -- nunca guarda un
 * token en localStorage/sessionStorage. withCredentials lo agrega
 * credentialsInterceptor en cada request, no hace falta repetirlo aqui.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sesion = inject(SesionEntrePestanasService);
  /** Estas pantallas muestran su error en la pagina: sin toast del interceptor (UI-13). */
  private readonly contextoErrorEnPantalla = new HttpContext().set(ERROR_EN_PANTALLA, true);

  /**
   * Sanctum SPA exige pedir la cookie CSRF antes de cualquier POST que
   * cambie estado (login, forgot/reset password) -- si no, el backend
   * rechaza la request por CSRF invalido.
   */
  private ensureCsrfCookie(contexto?: HttpContext): Observable<void> {
    return this.http.get<void>(urlSesion('/sanctum/csrf-cookie'), contexto ? { context: contexto } : {});
  }

  login(correo: string, password: string): Observable<LoginResponse> {
    return this.ensureCsrfCookie().pipe(
      switchMap(() => this.http.post<LoginResponse>(urlSesion('/login'), { correo, password })),
    );
  }

  verifyTwoFactor(code: string): Observable<{ user: Usuario }> {
    return this.http.post<{ user: Usuario }>(urlSesion('/login/2fa-verify'), { code }, {
      context: this.contextoErrorEnPantalla,
    });
  }

  logout(): Observable<void> {
    return this.http.post<void>(urlSesion('/logout'), {}).pipe(
      tap(() => this.sesion.cerrarSesion()),
    );
  }

  /** GET /sesion (API-09): usuario, sucursal, permisos, modulos activos y formato regional. */
  obtenerSesion(): Observable<Sesion> {
    return this.http
      .get<RespuestaDe<'/sesion', 'get'>>(urlApi('/sesion'))
      .pipe(map((respuesta) => respuesta.data));
  }

  me(): Observable<Usuario> {
    return this.http.get<RespuestaDe<'/user', 'get'>>(urlApi(`/user`)).pipe(map((respuesta) => respuesta.data));
  }

  requestPasswordReset(correo: string): Observable<{ status: string }> {
    return this.ensureCsrfCookie(this.contextoErrorEnPantalla).pipe(
      switchMap(() => this.http.post<{ status: string }>(
        urlSesion('/password/forgot'),
        { correo },
        { context: this.contextoErrorEnPantalla },
      )),
    );
  }

  resetPassword(payload: {
    correo: string;
    token: string;
    password: string;
    password_confirmation: string;
  }): Observable<{ status: string }> {
    return this.ensureCsrfCookie(this.contextoErrorEnPantalla).pipe(
      switchMap(() => this.http.post<{ status: string }>(
        urlSesion('/password/reset'),
        payload,
        { context: this.contextoErrorEnPantalla },
      )),
    );
  }

  getTwoFactorSetup(): Observable<TwoFactorSetupResponse> {
    return this.http.get<RespuestaDe<'/two-factor/qr-code', 'get'>>(urlApi(`/two-factor/qr-code`), {
      context: this.contextoErrorEnPantalla,
    });
  }

  confirmTwoFactor(code: string): Observable<TwoFactorConfirmResponse> {
    return this.http.post<RespuestaDe<'/two-factor/confirm', 'post'>>(
      urlApi(`/two-factor/confirm`),
      { code },
      { context: this.contextoErrorEnPantalla },
    );
  }
}
