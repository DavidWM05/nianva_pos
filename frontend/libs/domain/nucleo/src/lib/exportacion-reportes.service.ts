import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { paths, RutaApi } from '@nianva/api-contrato';
import { urlApi } from '@nianva/core-http';

export type EndpointExportar = {
  [Ruta in RutaApi]: paths[Ruta]['get'] extends {
    responses: { 200: { content: { 'text/csv; charset=UTF-8': string } } };
  } ? Ruta : never;
}[RutaApi];

@Injectable({ providedIn: 'root' })
export class ExportacionReportesService {
  private readonly http = inject(HttpClient);

  descargar(endpoint: EndpointExportar, filtros: Record<string, string | number>) {
    // La sobrecarga binaria de Angular devuelve HttpResponse<Blob>. RespuestaDe representa JSON.
    return this.http.request('GET', urlApi(endpoint), {
      params: filtros,
      observe: 'response',
      responseType: 'blob',
    });
  }
}
