import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { ERROR_EN_PANTALLA, urlApi, urlSesion } from '@nianva/core-http';
import { Observable, map, switchMap } from 'rxjs';

import { Sesion } from './sesion.types';
import { LoginResponse, TwoFactorConfirmResponse, TwoFactorSetupResponse, Usuario } from './usuario.types';

/**
 * Unico punto de acceso a los endpoints de autenticacion del backend.
 * Sesion por cookie httpOnly + CSRF (Sanctum SPA) -- nunca guarda un
 * token en localStorage/sessionStorage. withCredentials lo agrega
 * credentialsInterceptor en cada request, no hace falta repetirlo aqui.
 *
 * Solo HTTP (ARQ-12c): lo que la sesion hace en la app al salir (avisar a las otras pestanas)
 * lo agrega AuthService, en apps/pos.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
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
    return this.http.post<void>(urlSesion('/logout'), {});
  }

  /** GET /sesion (API-09): usuario, sucursal, permisos, modulos activos y formato regional. */
  obtenerSesion(): Observable<Sesion> {
    return this.http
      .get<RespuestaDe<'/sesion', 'get'>>(urlApi('/sesion'))
      .pipe(map((respuesta) => respuesta.data));
  }

  guardarPinCaja(passwordActual: string, pin: string): Observable<void> {
    const cuerpo: CuerpoDe<'/sesion/pin', 'put'> = { password_actual: passwordActual, pin };
    return this.http.put<void>(urlApi('/sesion/pin'), cuerpo, { context: this.contextoErrorEnPantalla });
  }

  bloquearSesion(): Observable<void> {
    return this.http.post<void>(urlApi('/sesion/bloquear'), {}, { context: this.contextoErrorEnPantalla });
  }

  desbloquearSesion(pin: string): Observable<void> {
    const cuerpo: CuerpoDe<'/sesion/desbloquear', 'post'> = { pin };
    return this.http.post<void>(urlApi('/sesion/desbloquear'), cuerpo, { context: this.contextoErrorEnPantalla });
  }

  solicitarAutorizacionSupervisor(cuerpo: CuerpoDe<'/autorizaciones', 'post'>): Observable<RespuestaDe<'/autorizaciones', 'post'>['data']> {
    return this.http.post<RespuestaDe<'/autorizaciones', 'post'>>(urlApi('/autorizaciones'), cuerpo, { context: this.contextoErrorEnPantalla })
      .pipe(map((respuesta) => respuesta.data));
  }

  elegirTerminal(terminalId: number): Observable<void> {
    const cuerpo: CuerpoDe<'/sesion/terminal', 'put'> = { terminal_id: terminalId };
    return this.http.put<void>(urlApi('/sesion/terminal'), cuerpo, { context: this.contextoErrorEnPantalla });
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
