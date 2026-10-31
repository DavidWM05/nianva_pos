import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import {
  ConfiguracionSeguridad,
  ConfiguracionTenant,
  ConfiguracionTenantFormPayload,
  LicenciaLocal,
} from './configuracion.types';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly http = inject(HttpClient);

  obtener(): Observable<ConfiguracionTenant> {
    return this.http
      .get<{ data: ConfiguracionTenant }>(urlApi(`/configuracion`))
      .pipe(map((r) => r.data));
  }

  actualizar(payload: ConfiguracionTenantFormPayload): Observable<ConfiguracionTenant> {
    return this.http
      .put<{ data: ConfiguracionTenant }>(urlApi(`/configuracion`), payload)
      .pipe(map((r) => r.data));
  }

  /**
   * Subconjunto publico (sin permiso configuracion.editar) que otros
   * modulos pueden leer -- ver ConfiguracionController::publica(). Hoy
   * solo trae codigo_barras_automatico (ver ProductoDetalleComponent).
   */
  publica(): Observable<{ codigo_barras_automatico: boolean }> {
    return this.http.get<{ codigo_barras_automatico: boolean }>(urlApi(`/configuracion/publica`));
  }

  /**
   * 404/403 si no hay tenant activo o el usuario no tiene el permiso
   * configuracion.ver -- el llamador decide como reaccionar (ver
   * ConfiguracionComponent: oculta la seccion en vez de mostrar un error).
   * Movido desde el perfil de Preferencias (ver el reporte): estos dias
   * son politica de toda la empresa, no algo personal.
   */
  obtenerSeguridad(): Observable<ConfiguracionSeguridad> {
    return this.http.get<ConfiguracionSeguridad>(urlApi(`/configuracion-seguridad`));
  }

  actualizarSeguridad(payload: ConfiguracionSeguridad): Observable<ConfiguracionSeguridad> {
    return this.http.put<ConfiguracionSeguridad>(urlApi(`/configuracion-seguridad`), payload);
  }

  /**
   * 404 si el tenant no tiene una licencia local registrada -- el llamador
   * decide como reaccionar (ver ConfiguracionComponent: oculta la sección
   * en vez de mostrar un error).
   */
  obtenerLicencia(): Observable<LicenciaLocal> {
    return this.http
      .get<{ data: LicenciaLocal }>(urlApi(`/licencia-local`))
      .pipe(map((r) => r.data));
  }
}
