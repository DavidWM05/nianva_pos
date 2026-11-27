import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { RespuestaDe } from '@nianva/api-contrato';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';

import { ERROR_EN_PANTALLA, urlApi } from '@nianva/core-http';
import { Terminal, TerminalPayload } from './terminal.types';

/** Listado de terminales con el contrato de API-06 (page, rows, sort_field, sort_order, q). */
@Injectable({ providedIn: 'root' })
export class TerminalListadoService {
  private readonly http = inject(HttpClient);

  private readonly contexto = new HttpContext().set(ERROR_EN_PANTALLA, true);

  listar(parametros: Record<string, string | number>) {
    return this.http
      .get<RespuestaDe<'/terminales', 'get'>>(urlApi('/terminales'), { params: parametros, context: this.contexto })
      .pipe(map((respuesta) => ({ ...respuesta, meta: { ...respuesta.meta, rows: Number(respuesta.meta.rows) } })));
  }

  listarDeSesion(): Observable<Terminal[]> {
    return this.http.get<RespuestaDe<'/sesion/terminales', 'get'>>(urlApi('/sesion/terminales'), { context: this.contexto })
      .pipe(map(respuesta => respuesta.data));
  }

  listarDeSucursal(sucursalId: number): Observable<Terminal[]> {
    const listar = (page: number) => this.listar({ page, rows: 100 });
    return listar(1).pipe(
      expand(({ meta }) => meta.page * meta.rows < meta.total ? listar(meta.page + 1) : EMPTY),
      reduce((terminales, { data }) => terminales.concat(data.filter((terminal) => terminal.sucursal_id === sucursalId)), [] as Terminal[]),
    );
  }

  obtener(id: number): Observable<Terminal> {
    return this.http.get<RespuestaDe<'/terminales/{terminal}', 'get'>>(urlApi(`/terminales/${id}`), { context: this.contexto })
      .pipe(map((respuesta) => respuesta.data));
  }

  crear(cuerpo: TerminalPayload): Observable<Terminal> {
    return this.http.post<RespuestaDe<'/terminales', 'post'>>(urlApi('/terminales'), cuerpo, { context: this.contexto })
      .pipe(map((respuesta) => respuesta.data));
  }

  actualizar(id: number, cuerpo: TerminalPayload): Observable<Terminal> {
    return this.http.put<RespuestaDe<'/terminales/{terminal}', 'put'>>(urlApi(`/terminales/${id}`), cuerpo, { context: this.contexto })
      .pipe(map((respuesta) => respuesta.data));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(urlApi(`/terminales/${id}`), { context: this.contexto });
  }
}
