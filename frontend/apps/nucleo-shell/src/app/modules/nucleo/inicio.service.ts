import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../core/api-config';
import { InicioResumen } from './inicio.types';

@Injectable({ providedIn: 'root' })
export class InicioService {
  private readonly http = inject(HttpClient);

  resumen(): Observable<InicioResumen> {
    return this.http.get<{ data: InicioResumen }>(`${API_BASE_URL}/api/inicio/resumen`).pipe(map((r) => r.data));
  }
}
