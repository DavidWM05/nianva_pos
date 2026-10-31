import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { MetodoPago } from './metodo-pago.types';

@Injectable({ providedIn: 'root' })
export class MetodoPagoService {
  private readonly http = inject(HttpClient);

  /**
   * `solo_activos=1` preserva el contrato original de este endpoint (lista
   * plana sin paginar) -- MetodoPagoController ahora tiene CRUD completo
   * (ver el modulo de administracion "Métodos de pago"), pero este
   * selector de la pantalla de venta sigue pidiendo solo la version simple.
   */
  listar(): Observable<MetodoPago[]> {
    return this.http
      .get<{ data: MetodoPago[] }>(urlApi(`/metodos-pago`), { params: { solo_activos: 1 } })
      .pipe(map((r) => r.data));
  }
}
