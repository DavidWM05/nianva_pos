import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CajaService } from '../../caja.service';
import { CajaActual, CajaSesion } from '../../caja.types';
import { Gasto } from '../../gasto.types';
import { GastoService } from '../../gasto.service';
import { CajaComponent } from './caja.component';

// UI-05: todos los montos de la caja con el pipe dinero (formato regional es-MX del spec).
describe('CajaComponent formato por pipe', () => {
  const permisos = { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true };
  const sesionAbierta: CajaSesion = {
    id: 1,
    sucursal_id: 1,
    usuario_id: 1,
    monto_apertura: '1500.00',
    monto_cierre: null,
    total_ventas_sistema: null,
    diferencia: null,
    fecha_apertura: '2026-07-22T10:00:00.000000Z',
    fecha_cierre: null,
    estado: 'abierta',
  };

  async function crear(estado: CajaActual, gastos: Gasto[] = []) {
    const cajaService = { actual: vi.fn().mockReturnValue(of(estado)), abrir: vi.fn(), cerrar: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CajaComponent],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: CajaService, useValue: cajaService },
        { provide: GastoService, useValue: { listar: vi.fn().mockReturnValue(of(gastos)), registrar: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CajaComponent);
    fixture.detectChanges();

    return { fixture, cajaService };
  }

  it('con caja abierta, apertura, totales y gastos salen con dinero', async () => {
    const { fixture } = await crear(
      { sesion: sesionAbierta, resumen: { ventas_count: 3, total_ventas: 12500.5, total_gastos: 1080 }, permisos },
      [{ id: 1, descripcion: 'Luz', monto: '1080.00', fecha: '2026-07-22T10:00:00.000000Z' }],
    );
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    for (const esperado of ['$1,500.00', '$12,500.50', '$1,080.00']) {
      expect(texto, esperado).toContain(esperado);
    }
  });

  it('al cerrar, el resultado y el desglose salen con dinero (con su signo)', async () => {
    const { fixture, cajaService } = await crear({ sesion: sesionAbierta, resumen: { ventas_count: 1, total_ventas: 100, total_gastos: 0 }, permisos });
    const cerrada: CajaSesion = {
      ...sesionAbierta,
      estado: 'cerrada',
      monto_cierre: '2580.00',
      total_ventas_sistema: '1100.00',
      diferencia: '-20.00',
    };
    cajaService.cerrar.mockReturnValue(
      of({ sesion: cerrada, desglose: { total_gastos: 1015, total_abonos_cxc: 1050, total_recargas_gc: 1030, total_pagos_cxp: 1010 } }),
    );
    cajaService.actual.mockReturnValue(of({ sesion: null, resumen: null, permisos }));

    fixture.componentInstance['montoFisico'].set(2580);
    fixture.componentInstance.cerrarCaja();
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    for (const esperado of ['$1,500.00', '$1,100.00', '$2,580.00', '-$20.00', '-$1,015.00', '+$1,050.00', '+$1,030.00', '-$1,010.00']) {
      expect(texto, esperado).toContain(esperado);
    }
  });
});
