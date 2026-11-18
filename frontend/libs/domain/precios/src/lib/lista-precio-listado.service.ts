import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { urlApi } from '@nianva/core-http';
import { Observable, map } from 'rxjs';
/** Listado de listas-precio con el contrato de API-06 (page, rows, sort_field, sort_order, q). */
@Injectable({ providedIn: 'root' })
export class ListaPrecioListadoService {
  private readonly http = inject(HttpClient);
  listar(
    parametros: Record<string, string | number>,
  ): Observable<RespuestaDe<'/precios/listas', 'get'>> {
    return this.http.get<RespuestaDe<'/precios/listas', 'get'>>(
      urlApi('/precios/listas'),
      { params: parametros },
    );
  }
  obtener(id: number) {
    return this.http.get<RespuestaDe<'/precios/listas/{lista}', 'get'>>(
      urlApi('/precios/listas/' + id),
    );
  }
  crear(datos: CuerpoDe<'/precios/listas', 'post'>) {
    return this.http
      .post<RespuestaDe<'/precios/listas', 'post'>>(
        urlApi('/precios/listas'),
        datos,
      )
      .pipe(map((r) => r.data));
  }
  actualizar(id: number, datos: CuerpoDe<'/precios/listas/{lista}', 'put'>) {
    return this.http
      .put<RespuestaDe<'/precios/listas/{lista}', 'put'>>(
        urlApi('/precios/listas/' + id),
        datos,
      )
      .pipe(map((r) => r.data));
  }
  desactivar(id: number) {
    return this.http
      .patch<RespuestaDe<'/precios/listas/{lista}/desactivar', 'patch'>>(
        urlApi('/precios/listas/' + id + '/desactivar'),
        {},
      )
      .pipe(map((r) => r.data));
  }
  guardarItem(
    id: number,
    datos: CuerpoDe<'/precios/listas/{lista}/items', 'post'>,
  ) {
    return this.http.post<RespuestaDe<'/precios/listas/{lista}/items', 'post'>>(
      urlApi('/precios/listas/' + id + '/items'),
      datos,
    );
  }
  actualizarItem(
    id: number,
    item: number,
    datos: CuerpoDe<'/precios/listas/{lista}/items/{item}', 'put'>,
  ) {
    return this.http.put<
      RespuestaDe<'/precios/listas/{lista}/items/{item}', 'put'>
    >(urlApi('/precios/listas/' + id + '/items/' + item), datos);
  }
  quitarItem(id: number, item: number) {
    return this.http.delete<
      RespuestaDe<'/precios/listas/{lista}/items/{item}', 'delete'>
    >(urlApi('/precios/listas/' + id + '/items/' + item));
  }
  asignarCliente(id: number, cliente: number) {
    const cuerpo: CuerpoDe<'/precios/listas/{lista}/clientes', 'post'> = {
      cliente_id: cliente,
    };
    return this.http.post<
      RespuestaDe<'/precios/listas/{lista}/clientes', 'post'>
    >(urlApi('/precios/listas/' + id + '/clientes'), cuerpo);
  }
  quitarCliente(id: number, asignacion: number) {
    return this.http.delete<
      RespuestaDe<'/precios/listas/{lista}/clientes/{asignacion}', 'delete'>
    >(urlApi('/precios/listas/' + id + '/clientes/' + asignacion));
  }
  disponibles() {
    return this.http
      .get<RespuestaDe<'/precios/listas/disponibles', 'get'>>(
        urlApi('/precios/listas/disponibles'),
      )
      .pipe(map((r) => r.data));
  }
}
