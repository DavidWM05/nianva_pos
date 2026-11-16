import type { RespuestaDe } from '@nianva/api-contrato';
import { urlApi } from '@nianva/core-http';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CatalogoPerfilesGiro, ClavePerfilGiro, PerfilGiroAplicado } from './perfil-giro.types';

/**
 * Perfiles de giro (ARQ-07): el catálogo y aplicar uno al tenant. Aplicar solo siembra lo que
 * falte (atributos, valores, categorías y unidades); nunca borra ni renombra.
 */
@Injectable({ providedIn: 'root' })
export class PerfilGiroService {
  private readonly http = inject(HttpClient);

  catalogo(): Observable<CatalogoPerfilesGiro> {
    return this.http.get<RespuestaDe<'/perfiles-giro', 'get'>>(urlApi('/perfiles-giro'));
  }

  aplicar(perfil: ClavePerfilGiro): Observable<PerfilGiroAplicado> {
    return this.http.put<RespuestaDe<'/configuracion/perfil-giro', 'put'>>(
      urlApi('/configuracion/perfil-giro'),
      { perfil },
    );
  }
}
