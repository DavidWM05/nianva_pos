import { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { ConsultaPagina, urlApi, opcionesOperacionSupervisada } from '@nianva/core-http';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { ReporteVentas, ReporteVentasFiltros, Venta, VentaCotizacion, VentaFormPayload, VentaItemPayload, VentasPagina } from './venta.types';

@Injectable({ providedIn: 'root' })
export class VentaService {
  private readonly http = inject(HttpClient);

  resolverCodigo(codigo: string) {
    return this.http.get<RespuestaDe<'/ventas/codigo', 'get'>>(urlApi('/ventas/codigo'), {params:{codigo}}).pipe(map(r=>r.data));
  }

  /** Mismo contrato que ClienteService/ProductoService.listar(). */
  listar(evento: ConsultaPagina, busqueda: string): Observable<VentasPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }
    if (busqueda.trim()) {
      params = params.set('filtro_cliente', busqueda.trim());
    }

    return this.http
      .get<RespuestaDe<'/ventas', 'get'>>(urlApi(`/ventas`), {
        params,
      })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  /**
   * D-7, transitorio: la devolución busca la venta por su `numero` (el id interno que publica el
   * backend) hasta que exista el folio de DAT-07. Devuelve el ulid de la venta, o null.
   */
  buscarPorNumero(numero: number): Observable<string | null> {
    const params = new HttpParams().set('filtro_numero', numero).set('rows', 1);

    return this.http
      .get<RespuestaDe<'/ventas', 'get'>>(urlApi(`/ventas`), { params })
      .pipe(map((r) => r.data[0]?.id ?? null));
  }

  buscarPorFolio(folio: string): Observable<string | null> {
    folio = folio.trim();
    if (!folio) {
      return of(null);
    }

    const params = new HttpParams().set('filtro_folio', folio).set('rows', 1);
    return this.http
      .get<RespuestaDe<'/ventas', 'get'>>(urlApi('/ventas'), { params })
      .pipe(map((respuesta) => respuesta.data[0]?.id ?? null));
  }

  obtener(id: string): Observable<Venta> {
    return this.http.get<RespuestaDe<'/ventas/{venta}', 'get'>>(urlApi(`/ventas/${id}`)).pipe(map((r) => r.data));
  }

  registrar(payload: VentaFormPayload, llaveIdempotencia?: string, tokenSupervisor?: string): Observable<Venta> {
    const cuerpo: CuerpoDe<'/ventas', 'post'> = payload;

    return this.http.post<RespuestaDe<'/ventas', 'post'>>(urlApi(`/ventas`), cuerpo, opcionesOperacionSupervisada(llaveIdempotencia, tokenSupervisor)).pipe(map((r) => r.data));
  }

  anular(id: string, motivo: string, llaveIdempotencia?: string, tokenSupervisor?: string): Observable<Venta> {
    const cuerpo: CuerpoDe<'/ventas/{venta}/anular', 'patch'> = { motivo };

    return this.http
      .patch<RespuestaDe<'/ventas/{venta}/anular', 'patch'>>(urlApi(`/ventas/${id}/anular`), cuerpo, opcionesOperacionSupervisada(llaveIdempotencia, tokenSupervisor))
      .pipe(map((r) => r.data));
  }

  /**
   * Precio siempre resuelto por el backend (PrecioService), nunca
   * calculado en el frontend -- se llama cada vez que la pantalla de
   * venta agrega o cambia la cantidad de una linea.
   */
  cotizar(items: VentaItemPayload[], contexto: Pick<CuerpoDe<'/ventas/cotizar', 'post'>, 'cliente_id' | 'lista_precio_id'> = {}): Observable<VentaCotizacion> {
    const cuerpo: CuerpoDe<'/ventas/cotizar', 'post'> = { items, ...contexto };

    return this.http
      .post<RespuestaDe<'/ventas/cotizar', 'post'>>(urlApi(`/ventas/cotizar`), cuerpo)
      // Antes de API-02a
      // El contrato trae cantidad como string (decimal del backend): se convierte, sin cast doble.
      // Desde API-02a las cadenas se conservan hasta los controles que las editan.
      .pipe(map(({ data }): VentaCotizacion => data));
  }

  /** Sin filtros: backend usa el mes actual (dia 1 a hoy) y todas las sucursales del tenant. */
  reporte(filtros: ReporteVentasFiltros = {}): Observable<ReporteVentas> {
    let params = new HttpParams();

    if (filtros.fechaDesde) {
      params = params.set('fecha_desde', filtros.fechaDesde);
    }
    if (filtros.fechaHasta) {
      params = params.set('fecha_hasta', filtros.fechaHasta);
    }
    if (filtros.sucursalId) {
      params = params.set('sucursal_id', filtros.sucursalId);
    }

    return this.http
      .get<RespuestaDe<'/ventas/reporte', 'get'>>(urlApi(`/ventas/reporte`), { params })
      .pipe(map((r) => r.data));
  }
}
