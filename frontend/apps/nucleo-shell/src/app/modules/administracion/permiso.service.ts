import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../core/api-config';
import { GrupoPermisos, Permiso } from './permiso.types';

/** Alimenta el checklist "asignar permisos" de RolFormComponent. */
@Injectable({ providedIn: 'root' })
export class PermisoService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Permiso[]> {
    return this.http.get<{ data: Permiso[] }>(`${API_BASE_URL}/api/permisos`).pipe(map((r) => r.data));
  }

  /** Agrupa por `modulo` client-side -- el backend ya los ordena por modulo/accion. */
  agrupadosPorModulo(): Observable<GrupoPermisos[]> {
    return this.listar().pipe(
      map((permisos) => {
        const grupos = new Map<string, Permiso[]>();
        for (const permiso of permisos) {
          const grupo = grupos.get(permiso.modulo) ?? [];
          grupo.push(permiso);
          grupos.set(permiso.modulo, grupo);
        }
        return Array.from(grupos.entries()).map(([modulo, permisos]) => ({ modulo, permisos }));
      }),
    );
  }
}
