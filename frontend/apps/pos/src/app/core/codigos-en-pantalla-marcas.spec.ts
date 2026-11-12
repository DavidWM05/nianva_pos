import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CotizacionService } from '../modules/cotizaciones/cotizacion.service';
import { CotizacionCrearPayload } from '../modules/cotizaciones/cotizacion.types';
import { PedidoService } from '../modules/delivery/pedido.service';
import { PedidoCrearPayload } from '../modules/delivery/pedido.types';
import { NominaService } from '../modules/payroll/nomina.service';
import { configurarBaseApi } from './api-config';
import { CODIGOS_EN_PANTALLA } from './errores.interceptor';

// ARQ-12: estas pantallas cambian el message de `sucursal_requerida` por MENSAJE_SUCURSAL_REQUERIDA,
// asi que su peticion lo marca y el interceptor no muestra el del backend. Solo ese codigo: los
// demas errores de negocio siguen en el interceptor.
describe('peticiones que manejan `sucursal_requerida` en pantalla', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    configurarBaseApi('http://x');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function marcaDe(peticion: () => Observable<unknown>): readonly string[] {
    peticion().subscribe();
    const [enviada] = httpMock.match(() => true);
    const codigos = (enviada.request as HttpRequest<unknown>).context.get(CODIGOS_EN_PANTALLA);
    enviada.flush({ data: {} });

    return codigos;
  }

  const cotizacion = { sucursal_id: 1 } as CotizacionCrearPayload;

  it('crear y actualizar una cotizacion', () => {
    const servicio = TestBed.inject(CotizacionService);

    expect(marcaDe(() => servicio.crear(cotizacion))).toEqual(['sucursal_requerida']);
    expect(marcaDe(() => servicio.actualizar(7, cotizacion))).toEqual(['sucursal_requerida']);
  });

  it('crear un pedido de delivery', () => {
    const servicio = TestBed.inject(PedidoService);

    expect(marcaDe(() => servicio.crear({ cliente_id: 1, sucursal_id: 1 } as PedidoCrearPayload))).toEqual(['sucursal_requerida']);
  });

  it('generar una nomina', () => {
    const servicio = TestBed.inject(NominaService);
    const payload = { sucursal_id: 1, periodo_inicio: '2026-11-01', periodo_fin: '2026-11-15' };

    expect(marcaDe(() => servicio.generar(payload))).toEqual(['sucursal_requerida']);
  });
});
