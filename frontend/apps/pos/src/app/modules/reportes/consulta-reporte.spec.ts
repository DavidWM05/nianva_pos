import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { MetaListado } from '@nianva/ui-data';
import { ToastService } from '@nianva/ui-feedback';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { urlApi } from '../../core/api-config';
import { ConsultaReporte } from './consulta-reporte';


function meta(exportar: boolean, page = 1, total = 43): MetaListado {
  return { page, rows: 25, total, filtros_aplicados: {}, permisos: { exportar } };
}

describe('ConsultaReporte', () => {
  let consulta: ConsultaReporte<{ meta: MetaListado }>;
  let http: HttpTestingController;
  let urlReporte: string;
  let urlExportar: string;
  const toast = { error: vi.fn() };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ToastService, useValue: toast }],
    });
    http = TestBed.inject(HttpTestingController);
    urlReporte = urlApi('/ventas/reporte');
    urlExportar = urlApi('/ventas/reporte/exportar');
    const cliente = TestBed.inject(HttpClient);
    consulta = TestBed.runInInjectionContext(() => new ConsultaReporte(
      (params) => cliente.get<{ meta: MetaListado }>(urlReporte, { params }),
      '/ventas/reporte/exportar',
      () => ({ fecha_desde: '2024-06-14', sucursal_id: 2 }),
    ));
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('conserva filtros y consulta otra página con su total global', () => {
    consulta.cargar();
    http.expectOne(urlReporte + '?page=1&rows=25').flush({ meta: meta(true) });
    consulta.paginar({ page: 2, rows: 25, sortField: null, sortOrder: null });
    expect(consulta.cargando()).toBe(true);
    http.expectOne(urlReporte + '?page=2&rows=25').flush({ meta: meta(true, 2) });
    expect(consulta.respuesta()?.meta.total).toBe(43);
    consulta.reiniciar();
    http.expectOne(urlReporte + '?page=1&rows=25').flush({ meta: meta(true, 1, 0) });
    expect(consulta.estado()).toBe('vacio');
  });

  it('pasa de carga a error y permite volver a consultar', () => {
    consulta.cargar();
    expect(consulta.estado()).toBe('cargando');
    http.expectOne(urlReporte + '?page=1&rows=25').flush({ message: 'Sin permiso' }, { status: 403, statusText: 'Forbidden' });
    expect(consulta.estado()).toBe('error');
    consulta.cargar();
    http.expectOne(urlReporte + '?page=1&rows=25').flush({ meta: meta(false) });
    expect(consulta.estado()).toBe('listo');
    consulta.exportar();
    http.expectNone((peticion) => peticion.url === urlExportar);
  });

  it('envía los filtros sin paginación y traduce el error_code del CSV', async () => {
    consulta.cargar();
    http.expectOne(urlReporte + '?page=1&rows=25').flush({ meta: meta(true) });
    consulta.exportar();
    const exportacion = http.expectOne(urlExportar + '?fecha_desde=2024-06-14&sucursal_id=2');
    expect(exportacion.request.responseType).toBe('blob');
    const json = '{"error_code":"reporte_exportacion_limite"}';
    const cuerpo = Object.assign(new Blob([json], { type: 'application/json' }), { text: async () => json });
    exportacion.flush(cuerpo, {
      status: 422, statusText: 'Unprocessable Content',
    });
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('10 000 filas')));
    expect(consulta.exportando()).toBe(false);
  });
});
