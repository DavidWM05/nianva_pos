import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { TipoUnidadMedida, UnidadMedida } from './unidad-medida.types';

export interface UnidadMedidaFormPayload {
  nombre: string;
  abreviatura: string;
  tipo: TipoUnidadMedida;
  activo?: boolean;
}

/**
 * UnidadMedidaController no sigue el contrato real de paginacion/meta.permisos
 * de Nucleo (ver el reporte de validacion del backend, pendiente de
 * alineacion) -- `index()` no pagina (UnidadMedidaService::listarActivas()
 * devuelve la coleccion completa) y ninguna respuesta trae `meta`. Tampoco
 * hay `GET /unidades-medida/{id}`: `obtener()` resuelve el registro
 * filtrando la lista completa ya cargada, no hay otra forma de pedirlo
 * suelto hoy. Ninguna ruta de este modulo exige permiso (`routes/api.php`
 * no le pone `permiso:` a ninguna de las 4) -- por eso no hay un tipo
 * `UnidadesMedidaPermisos` aqui, a diferencia de Categoria/Departamento.
 */
@Injectable({ providedIn: 'root' })
export class UnidadMedidaService {
  private readonly http = inject(HttpClient);

  listar(): Observable<UnidadMedida[]> {
    return this.http.get<{ data: UnidadMedida[] }>(urlApi(`/unidades-medida`)).pipe(map((r) => r.data));
  }

  crear(payload: UnidadMedidaFormPayload): Observable<UnidadMedida> {
    return this.http
      .post<{ data: UnidadMedida }>(urlApi(`/unidades-medida`), payload)
      .pipe(map((r) => r.data));
  }

  actualizar(id: number, payload: UnidadMedidaFormPayload): Observable<UnidadMedida> {
    return this.http
      .put<{ data: UnidadMedida }>(urlApi(`/unidades-medida/${id}`), payload)
      .pipe(map((r) => r.data));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(urlApi(`/unidades-medida/${id}`));
  }
}
