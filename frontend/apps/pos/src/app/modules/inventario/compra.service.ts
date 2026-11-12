import { RespuestaDe, CuerpoDe } from '@nianva/api-contrato';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { ProveedorSimple } from './producto.types';

export interface CompraItemPayload {
  variante_id: number;
  cantidad: number;
  precio_compra: number;
}

export interface CompraFormPayload {
  proveedor_id: number;
  numero_comprobante?: string | null;
  items: CompraItemPayload[];
}

export interface ProveedorFormPayload {
  razon_social: string;
}

/**
 * Puerta hacia CompraController/ProveedorController -- ver el reporte del
 * bug "no puedo ingresar stock": antes de esto no existia ningun servicio
 * de frontend que llamara a estos endpoints porque no existian.
 */
@Injectable({ providedIn: 'root' })
export class CompraService {
  private readonly http = inject(HttpClient);

  proveedores(): Observable<ProveedorSimple[]> {
    return this.http
      .get<RespuestaDe<'/proveedores', 'get'>>(urlApi(`/proveedores`))
      .pipe(map((r) => r.data));
  }

  crearProveedor(payload: ProveedorFormPayload): Observable<ProveedorSimple> {
    const cuerpo: CuerpoDe<'/proveedores', 'post'> = payload;
    return this.http
      .post<RespuestaDe<'/proveedores', 'post'>>(urlApi(`/proveedores`), cuerpo)
      .pipe(map((r) => r.data));
  }

  registrar(payload: CompraFormPayload): Observable<void> {
    const cuerpo: CuerpoDe<'/compras', 'post'> = payload;
    return this.http
      .post<RespuestaDe<'/compras', 'post'>>(urlApi(`/compras`), cuerpo)
      .pipe(map(() => undefined));
  }
}
