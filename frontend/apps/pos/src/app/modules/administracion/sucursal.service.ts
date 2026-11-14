import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { RespuestaDe } from '@nianva/api-contrato';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';

export type SucursalSimple = Pick<RespuestaDe<'/sucursales', 'get'>['data'][number], 'id' | 'nombre'>;

/** Catalogo de apoyo simple -- selector de sucursal del formulario de Usuario, sin CRUD propio (fuera de alcance de esta fase). */
@Injectable({ providedIn: 'root' })
export class SucursalService {
  private readonly http = inject(HttpClient);

  listar(): Observable<SucursalSimple[]> {
    return this.http.get<RespuestaDe<'/sucursales', 'get'>>(urlApi(`/sucursales`)).pipe(map((r) => r.data));
  }
}
