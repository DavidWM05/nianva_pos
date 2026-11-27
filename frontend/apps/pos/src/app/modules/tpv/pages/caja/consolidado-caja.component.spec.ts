import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { urlApi } from '@nianva/core-http';
import { ImpresionService } from '@nianva/ui-print';
import { describe, expect, it, vi } from 'vitest';

import { ConsolidadoCajaComponent } from './consolidado-caja.component';

describe('ConsolidadoCajaComponent', () => {
  it('consolida la fecha elegida y muestra el original, el complementario y el total', async () => {
    const imprimir = vi.fn();
    await TestBed.configureTestingModule({
      imports: [ConsolidadoCajaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ImpresionService, useValue: { imprimir } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConsolidadoCajaComponent);
    fixture.detectChanges();

    const fecha = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    fecha.value = '2026-11-26';
    fecha.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const boton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(elemento => elemento.textContent?.trim() === 'Consolidar');
    boton?.click();

    const http = TestBed.inject(HttpTestingController);
    const peticion = http.expectOne(urlApi('/caja/consolidado'));
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ fecha_operativa: '2026-11-26' });
    expect(peticion.request.headers.get('Idempotency-Key')).toHaveLength(26);
    const documento = { fecha_cierre: '2026-11-26T17:00:00Z', total_teorico: '50.00',
      total_contado: '50.00', diferencia: '0.00', cortes: [] };
    peticion.flush({ data: { encabezado: { empresa: 'Comercio', sucursal: 'Centro', folio: 'original' }, fecha_operativa: '2026-11-26',
      documentos: [
        { ...documento, id: 'original', original_id: null, supervisor_apertura: null },
        { ...documento, id: 'extra', original_id: 'original', supervisor_apertura: 'Patricia' },
      ], total_teorico: '100.00', total_contado: '100.00', diferencia: '0.00',
    } });
    fixture.detectChanges();

    const contenido = fixture.nativeElement.textContent;
    expect(contenido).toContain('Total del día');
    expect(contenido).toContain('100.00');
    expect(contenido).toContain('Consolidado original');
    expect(contenido).toContain('Consolidado complementario');
    expect(contenido).toContain('Patricia');
    const comprobante = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(elemento => elemento.textContent?.trim() === 'Imprimir comprobante');
    comprobante?.click();
    expect(imprimir).toHaveBeenCalledWith(expect.objectContaining({
      tabla: expect.objectContaining({ filas: [
        expect.arrayContaining([{ texto: 'Consolidado original' }]),
        expect.arrayContaining([{ texto: 'Consolidado complementario', detalle: 'Patricia' }]),
      ] }),
      totales: expect.arrayContaining([expect.objectContaining({ etiqueta: 'Total contado', importe: '100.00' })]),
    }), 'carta');
    http.verify();
  });
});
