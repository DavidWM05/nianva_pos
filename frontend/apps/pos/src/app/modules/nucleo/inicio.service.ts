import { HttpClient } from '@angular/common/http';
import type { RespuestaDe } from '@nianva/api-contrato';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { InicioResumen } from './inicio.types';

@Injectable({ providedIn: 'root' })
export class InicioService {
  private readonly http = inject(HttpClient);

  resumen(): Observable<InicioResumen> {
    return this.http.get<RespuestaDe<'/inicio/resumen', 'get'>>(urlApi(`/inicio/resumen`)).pipe(map((r) => r.data as InicioResumen));
  }
}
