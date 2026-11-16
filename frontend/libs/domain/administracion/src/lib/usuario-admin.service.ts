import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { ConsultaPagina, ERROR_EN_PANTALLA, urlApi } from '@nianva/core-http';
import { Observable, map } from 'rxjs';

import { UsuarioAdmin, UsuariosPagina, UsuariosPermisos } from './usuario.types';

/** Cuerpo del alta: password y roles obligatorios, tal cual el contrato de POST /usuarios. */
export type UsuarioAltaPayload = CuerpoDe<'/usuarios', 'post'>;

/**
 * Cuerpo de la edicion: parcial. Una password en blanco o ausente no cambia la actual y, si
 * `roles` no llega, se conservan (GuardarUsuarioRequest). El contrato de PUT ya documenta la
 * rama de edicion del FormRequest (password y roles opcionales), asi que sale tal cual.
 */
export type UsuarioEdicionPayload = CuerpoDe<'/usuarios/{usuario}', 'put'>;

/** Lo que emite el formulario de usuario: un alta o una edicion. */
export type UsuarioFormPayload = UsuarioAltaPayload | UsuarioEdicionPayload;

/** Un payload es de alta si trae password (no vacia) y la lista de roles. */
export function esAltaUsuario(payload: UsuarioFormPayload): payload is UsuarioAltaPayload {
  return typeof payload.password === 'string' && payload.password !== '' && Array.isArray(payload.roles);
}

/**
 * Nombrado *Admin para no chocar con ningun futuro AuthService/UsuarioService
 * de "quien soy" -- este es el CRUD de administracion (ver el reporte de
 * Fase C), mismo contrato que ClienteService.
 */
@Injectable({ providedIn: 'root' })
export class UsuarioAdminService {
  private readonly http = inject(HttpClient);
  private readonly contextoErrorEnPantalla = new HttpContext().set(ERROR_EN_PANTALLA, true);

  listar(evento: ConsultaPagina, busqueda: string): Observable<UsuariosPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);
    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }
    if (busqueda.trim()) {
      params = params.set('filtro_nombre', busqueda.trim());
    }

    return this.http
      .get<RespuestaDe<'/usuarios', 'get'>>(urlApi(`/usuarios`), {
        params,
      })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  /** Lista completa (sin paginar) para el selector de usuario del navegador global de Auditoría. */
  listarTodos(): Observable<UsuarioAdmin[]> {
    return this.listar({ first: 0, rows: 100, sortField: null, sortOrder: null, filters: {} }, '').pipe(
      map((pagina) => pagina.data),
    );
  }

  obtener(id: number): Observable<{ usuario: UsuarioAdmin; permisos: UsuariosPermisos }> {
    return this.http
      .get<RespuestaDe<'/usuarios/{usuario}', 'get'>>(urlApi(`/usuarios/${id}`))
      .pipe(map((r) => ({ usuario: r.data, permisos: r.meta.permisos })));
  }

  crear(payload: UsuarioAltaPayload): Observable<UsuarioAdmin> {
    const cuerpo: CuerpoDe<'/usuarios', 'post'> = payload;

    return this.http.post<RespuestaDe<'/usuarios', 'post'>>(urlApi(`/usuarios`), cuerpo).pipe(map((r) => r.data));
  }

  actualizar(id: number, payload: UsuarioEdicionPayload): Observable<UsuarioAdmin> {
    const cuerpo: UsuarioEdicionPayload = payload;

    return this.http
      .put<RespuestaDe<'/usuarios/{usuario}', 'put'>>(urlApi(`/usuarios/${id}`), cuerpo)
      .pipe(map((r) => r.data));
  }

  desactivar(id: number): Observable<UsuarioAdmin> {
    return this.http
      .patch<RespuestaDe<'/usuarios/{usuario}/desactivar', 'patch'>>(urlApi(`/usuarios/${id}/desactivar`), {})
      .pipe(map((r) => r.data));
  }

  /**
   * Ya no es autoservicio (ver el reporte) -- un admin desactiva el 2FA de
   * OTRO usuario. `code` es el TOTP de quien ejecuta la accion (el admin
   * autenticado), no del usuario objetivo -- ver dos-factor.reciente en el
   * backend. Solo se manda si la cuenta del admin tiene 2FA confirmado (si
   * no, la ruta no lo exige).
   */
  desactivarDosFactor(id: number, code?: string): Observable<UsuarioAdmin> {
    return this.http
      .post<RespuestaDe<'/usuarios/{usuario}/desactivar-2fa', 'post'>>(urlApi(`/usuarios/${id}/desactivar-2fa`), code ? { code } : {}, {
        context: this.contextoErrorEnPantalla,
      })
      .pipe(map((r) => r.data));
  }
}
