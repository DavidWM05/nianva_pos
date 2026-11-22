import { Injectable, inject } from '@angular/core';
import {
  AuthApiService,
  LoginResponse,
  Sesion,
  TwoFactorConfirmResponse,
  TwoFactorSetupResponse,
  Usuario,
} from '@nianva/domain-sesion';
import { Observable, tap } from 'rxjs';

import { SesionEntrePestanasService } from './sesion-entre-pestanas.service';

/**
 * Los endpoints de autenticacion para la app. Las peticiones son de AuthApiService
 * (@nianva/domain-sesion, ARQ-12c); aqui se agrega lo que depende de la app: al salir,
 * SesionEntrePestanasService cierra la sesion en esta pestana y avisa a las demas.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApiService);
  private readonly sesion = inject(SesionEntrePestanasService);

  login(correo: string, password: string): Observable<LoginResponse> {
    return this.api.login(correo, password);
  }

  verifyTwoFactor(code: string): Observable<{ user: Usuario }> {
    return this.api.verifyTwoFactor(code);
  }

  logout(): Observable<void> {
    return this.api.logout().pipe(
      tap(() => this.sesion.cerrarSesion()),
    );
  }

  /** SEG-12: bloquea la sesion; se desbloquea con el PIN de caja (BloqueoSesionComponent). */
  bloquearSesion(): Observable<void> {
    return this.api.bloquearSesion();
  }

  /** GET /sesion (API-09): usuario, sucursal, permisos, modulos activos y formato regional. */
  obtenerSesion(): Observable<Sesion> {
    return this.api.obtenerSesion();
  }

  me(): Observable<Usuario> {
    return this.api.me();
  }

  requestPasswordReset(correo: string): Observable<{ status: string }> {
    return this.api.requestPasswordReset(correo);
  }

  resetPassword(payload: {
    correo: string;
    token: string;
    password: string;
    password_confirmation: string;
  }): Observable<{ status: string }> {
    return this.api.resetPassword(payload);
  }

  getTwoFactorSetup(): Observable<TwoFactorSetupResponse> {
    return this.api.getTwoFactorSetup();
  }

  confirmTwoFactor(code: string): Observable<TwoFactorConfirmResponse> {
    return this.api.confirmTwoFactor(code);
  }
}
