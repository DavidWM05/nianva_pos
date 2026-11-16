import type { RespuestaDe } from '@nianva/api-contrato';
import { urlApi } from '@nianva/core-http';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  Atributo,
  AtributoDetalle,
  AtributoPayload,
  AtributoValorPayload,
  AtributosPagina,
} from './atributo.types';

/**
 * Atributos genéricos de variante (ARQ-07) y sus valores, que son un sub-recurso sin lista
 * propia: cada escritura de un valor responde con el atributo completo.
 */
@Injectable({ providedIn: 'root' })
export class AtributoService {
  private readonly http = inject(HttpClient);

  /** Listado uniforme de API-06 (page, rows, sort_field, sort_order, q). */
  listar(parametros: Record<string, string | number>): Observable<AtributosPagina> {
    return this.http
      .get<RespuestaDe<'/atributos', 'get'>>(urlApi('/atributos'), { params: parametros })
      .pipe(
        map((r) => {
          if (!('meta' in r)) throw new Error('El listado requiere la respuesta paginada.');
          return r;
        }),
      );
  }

  /** Todos los atributos con sus valores, para el formulario de variante. */
  conValores(): Observable<Atributo[]> {
    return this.http
      .get<RespuestaDe<'/atributos', 'get'>>(urlApi('/atributos'), { params: { con_valores: 1 } })
      .pipe(map((r) => r.data));
  }

  obtener(id: number): Observable<AtributoDetalle> {
    return this.http.get<RespuestaDe<'/atributos/{atributo}', 'get'>>(urlApi(`/atributos/${id}`));
  }

  crear(datos: AtributoPayload): Observable<Atributo> {
    return this.http
      .post<RespuestaDe<'/atributos', 'post'>>(urlApi('/atributos'), datos)
      .pipe(map((r) => r.data));
  }

  actualizar(id: number, datos: AtributoPayload): Observable<Atributo> {
    return this.http
      .put<RespuestaDe<'/atributos/{atributo}', 'put'>>(urlApi(`/atributos/${id}`), datos)
      .pipe(map((r) => r.data));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(urlApi(`/atributos/${id}`));
  }

  crearValor(atributoId: number, datos: AtributoValorPayload): Observable<Atributo> {
    return this.http
      .post<RespuestaDe<'/atributos/{atributo}/valores', 'post'>>(
        urlApi(`/atributos/${atributoId}/valores`),
        datos,
      )
      .pipe(map((r) => r.data));
  }

  actualizarValor(valorId: number, datos: AtributoValorPayload): Observable<Atributo> {
    return this.http
      .put<RespuestaDe<'/atributo-valores/{valor}', 'put'>>(urlApi(`/atributo-valores/${valorId}`), datos)
      .pipe(map((r) => r.data));
  }

  eliminarValor(valorId: number): Observable<void> {
    return this.http.delete<void>(urlApi(`/atributo-valores/${valorId}`));
  }
}
