import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../core/api-config';
import { Campana, CampanaEnviarPayload } from './campana.types';

/**
 * Solo enviar() -- el catalogo real de permisos para `crm_campanas` es
 * unicamente `['enviar']` (ver NucleoRolesPermisosSeeder), y
 * CrmAvanzadoController no tiene index(): una campaña se crea y se envia
 * en la misma accion, sin borrador ni historial consultable.
 */
@Injectable({ providedIn: 'root' })
export class CampanaService {
  private readonly http = inject(HttpClient);

  enviar(payload: CampanaEnviarPayload): Observable<Campana> {
    return this.http
      .post<{ data: Campana }>(`${API_BASE_URL}/api/crm/campanas/enviar`, payload)
      .pipe(map((r) => r.data));
  }
}
