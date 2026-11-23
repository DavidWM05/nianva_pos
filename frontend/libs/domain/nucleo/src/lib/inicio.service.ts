import { HttpClient } from '@angular/common/http';
import type { RespuestaDe } from '@nianva/api-contrato';
import { urlApi } from '@nianva/core-http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { InicioResumenMetricas, VarianteRankingInicio } from './inicio.types';

function esVariante(valor: unknown): valor is VarianteRankingInicio {
  return typeof valor === 'object' && valor !== null
    && 'variante_id' in valor && typeof valor.variante_id === 'number'
    && 'producto_nombre' in valor && (valor.producto_nombre === null || typeof valor.producto_nombre === 'string')
    && 'cantidad_base' in valor && typeof valor.cantidad_base === 'string';
}

// Scramble describe variantes como string. La respuesta real publica una lista.
function variantesDelRanking(valor: unknown): VarianteRankingInicio[] {
  return Array.isArray(valor) ? valor.filter(esVariante) : [];
}

@Injectable({ providedIn: 'root' })
export class InicioService {
  private readonly http = inject(HttpClient);

  resumen(): Observable<InicioResumenMetricas> {
    return this.resumenMetricas();
  }

  resumenMetricas(sucursalId?: number): Observable<InicioResumenMetricas> {
    const params = sucursalId === undefined ? undefined : { sucursal_id: sucursalId };
    return this.http.get<RespuestaDe<'/inicio/resumen', 'get'>>(urlApi('/inicio/resumen'), { params }).pipe(
      map(({ data }) => ({
        ...data,
        ranking_variantes: data.ranking_variantes.map(({ unidad, variantes }) => ({
          unidad, variantes: variantesDelRanking(variantes),
        })),
      })),
    );
  }
}
