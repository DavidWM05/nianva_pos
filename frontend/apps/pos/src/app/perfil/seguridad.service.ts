import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { Observable, map } from 'rxjs';

import { urlApi } from '../core/api-config';
import { ERROR_EN_PANTALLA } from '../core/errores.interceptor';
import { CambiarPasswordPayload, DispositivoConfiable } from './seguridad.types';

/**
 * Endpoints de Preferencias (antes "Seguridad", ver el reporte): mis
 * dispositivos confiables y cambiar mi propia contraseña. Separado de
 * AuthService a proposito -- AuthService es el ciclo de vida del login
 * (entrar/salir), esto es configuracion de cuenta ya autenticada.
 *
 * dias_dispositivo_normal/admin (politica de toda la empresa) y desactivar
 * 2FA (ya no es autoservicio) NO viven aqui -- ver ConfiguracionService y
 * UsuarioAdminService respectivamente.
 */
@Injectable({ providedIn: 'root' })
export class SeguridadService {
  private readonly http = inject(HttpClient);
  private readonly contextoErrorEnPantalla = new HttpContext().set(ERROR_EN_PANTALLA, true);

  listarDispositivosConfiables(): Observable<DispositivoConfiable[]> {
    return this.http
      .get<RespuestaDe<'/dispositivos-confiables', 'get'>>(urlApi(`/dispositivos-confiables`))
      .pipe(map((respuesta) => respuesta.data));
  }

  revocarDispositivo(id: number): Observable<void> {
    return this.http.delete<void>(urlApi(`/dispositivos-confiables/${id}`));
  }

  revocarTodosLosDispositivos(): Observable<void> {
    return this.http.delete<void>(urlApi(`/dispositivos-confiables`));
  }

  /** Protegido por dos-factor.reciente en el backend -- ver `code` en CambiarPasswordPayload. */
  cambiarPassword(payload: CambiarPasswordPayload): Observable<void> {
    const cuerpo: CuerpoDe<'/password/change', 'post'> = payload;

    return this.http.post<void>(urlApi(`/password/change`), cuerpo, {
      context: this.contextoErrorEnPantalla,
    });
  }
}
