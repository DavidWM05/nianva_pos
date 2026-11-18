import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { urlApi } from '@nianva/core-http';
import { Observable, map } from 'rxjs';

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
    const cuerpo: CuerpoDe<'/crm/campanas/enviar', 'post'> = payload;

    return this.http
      .post<RespuestaDe<'/crm/campanas/enviar', 'post'>>(
        urlApi(`/crm/campanas/enviar`),
        cuerpo,
      )
      .pipe(map((r) => r.data));
  }
}
