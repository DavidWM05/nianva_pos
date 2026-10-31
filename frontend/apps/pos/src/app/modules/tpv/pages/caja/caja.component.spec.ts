import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CajaService } from '../../caja.service';
import { CajaActual, CajaSesion } from '../../caja.types';
import { Gasto } from '../../gasto.types';
import { GastoService } from '../../gasto.service';
import { CajaComponent } from './caja.component';

describe('CajaComponent', () => {
  let fixture: ComponentFixture<CajaComponent>;
  let cajaService: { actual: ReturnType<typeof vi.fn>; abrir: ReturnType<typeof vi.fn>; cerrar: ReturnType<typeof vi.fn> };
  let gastoService: { listar: ReturnType<typeof vi.fn>; registrar: ReturnType<typeof vi.fn> };
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const sesionAbierta: CajaSesion = {
    id: 1,
    sucursal_id: 1,
    usuario_id: 1,
    monto_apertura: '500.00',
    monto_cierre: null,
    total_ventas_sistema: null,
    diferencia: null,
    fecha_apertura: '2026-07-22T10:00:00.000000Z',
    fecha_cierre: null,
    estado: 'abierta',
  };

  async function crearComponente(estado: CajaActual): Promise<void> {
    cajaService = {
      actual: vi.fn().mockReturnValue(of(estado)),
      abrir: vi.fn(),
      cerrar: vi.fn(),
    };
    gastoService = {
      listar: vi.fn().mockReturnValue(of([])),
      registrar: vi.fn(),
    };
    toastService = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CajaComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: CajaService, useValue: cajaService },
        { provide: GastoService, useValue: gastoService },
        { provide: ToastService, useValue: toastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CajaComponent);
    fixture.detectChanges();
  }

  it('sin caja abierta, muestra el formulario de apertura', async () => {
    await crearComponente({
      sesion: null,
      resumen: null,
      permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true },
    });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No hay caja abierta');
    expect(fixture.nativeElement.querySelector('#caja-monto-apertura')).not.toBeNull();
  });

  it('sin permiso para abrir, oculta el formulario y explica por que', async () => {
    await crearComponente({
      sesion: null,
      resumen: null,
      permisos: { abrir: false, cerrar: false, gastos_ver: false, gastos_crear: false },
    });

    expect(fixture.nativeElement.querySelector('#caja-monto-apertura')).toBeNull();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No tienes permiso para abrir la caja.');
  });

  it('sin caja abierta, el boton "Registrar gasto" no se muestra', async () => {
    await crearComponente({
      sesion: null,
      resumen: null,
      permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true },
    });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Registrar gasto');
  });

  it('con caja abierta, muestra el resumen de la sesion (incluye gastos) y el formulario de cierre', async () => {
    await crearComponente({
      sesion: sesionAbierta,
      resumen: { ventas_count: 3, total_ventas: 250, total_gastos: 80 },
      permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true },
    });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Caja abierta');
    expect(texto).toContain('3');
    expect(texto).toContain('80');
    expect(fixture.nativeElement.querySelector('#caja-monto-fisico')).not.toBeNull();
  });

  it('con caja abierta y permiso, muestra la lista de gastos de la sesion', async () => {
    const gastos: Gasto[] = [{ id: 1, descripcion: 'Luz', monto: '80.00', fecha: '2026-07-22T10:00:00.000000Z' }];
    await crearComponente({
      sesion: sesionAbierta,
      resumen: { ventas_count: 0, total_ventas: 0, total_gastos: 80 },
      permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true },
    });
    gastoService.listar.mockReturnValue(of(gastos));
    fixture.componentInstance['cargarGastos'](1);
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Luz');
  });

  it('registrar un gasto refresca el resumen en vivo', async () => {
    await crearComponente({
      sesion: sesionAbierta,
      resumen: { ventas_count: 0, total_ventas: 0, total_gastos: 0 },
      permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true },
    });

    gastoService.registrar.mockReturnValue(of({ id: 2, descripcion: 'Agua', monto: '40.00', fecha: '2026-07-22T11:00:00.000000Z' }));
    cajaService.actual.mockReturnValue(
      of({
        sesion: sesionAbierta,
        resumen: { ventas_count: 0, total_ventas: 0, total_gastos: 40 },
        permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true },
      }),
    );

    fixture.componentInstance['descripcionGasto'].set('Agua');
    fixture.componentInstance['montoGasto'].set(40);
    fixture.componentInstance.registrarGasto();
    fixture.detectChanges();

    expect(gastoService.registrar).toHaveBeenCalledWith('Agua', 40);
    expect(cajaService.actual).toHaveBeenCalledTimes(2);

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('40');
  });

  it('al cerrar la caja, muestra el resultado con la diferencia calculada', async () => {
    await crearComponente({
      sesion: sesionAbierta,
      resumen: { ventas_count: 1, total_ventas: 100, total_gastos: 0 },
      permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true },
    });

    const cerrada: CajaSesion = {
      ...sesionAbierta,
      estado: 'cerrada',
      monto_cierre: '580.00',
      total_ventas_sistema: '100.00',
      diferencia: '-20.00',
    };
    cajaService.cerrar.mockReturnValue(
      of({ sesion: cerrada, desglose: { total_gastos: 15, total_abonos_cxc: 50, total_recargas_gc: 30, total_pagos_cxp: 10 } }),
    );
    cajaService.actual.mockReturnValue(
      of({ sesion: null, resumen: null, permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true } }),
    );

    fixture.componentInstance['montoFisico'].set(580);
    fixture.componentInstance.cerrarCaja();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Caja cerrada');
    expect(texto).toContain('-20.00');
  });

  it('al cerrar la caja, muestra el desglose del total teorico (gastos, abonos CxC, recargas GC, pagos CxP)', async () => {
    await crearComponente({
      sesion: sesionAbierta,
      resumen: { ventas_count: 1, total_ventas: 100, total_gastos: 0 },
      permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true },
    });

    const cerrada: CajaSesion = { ...sesionAbierta, estado: 'cerrada', monto_cierre: '580.00', total_ventas_sistema: '100.00', diferencia: '0.00' };
    cajaService.cerrar.mockReturnValue(
      of({ sesion: cerrada, desglose: { total_gastos: 15, total_abonos_cxc: 50, total_recargas_gc: 30, total_pagos_cxp: 10 } }),
    );
    cajaService.actual.mockReturnValue(
      of({ sesion: null, resumen: null, permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true } }),
    );

    fixture.componentInstance['montoFisico'].set(580);
    fixture.componentInstance.cerrarCaja();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Desglose del total teórico');
    expect(texto).toContain('50');
    expect(texto).toContain('30');
    expect(texto).toContain('10');
  });

  it('cerrarResumenDeCierre() limpia tanto la sesion cerrada como su desglose', async () => {
    await crearComponente({
      sesion: sesionAbierta,
      resumen: { ventas_count: 1, total_ventas: 100, total_gastos: 0 },
      permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true },
    });

    const cerrada: CajaSesion = { ...sesionAbierta, estado: 'cerrada', monto_cierre: '580.00', total_ventas_sistema: '100.00', diferencia: '0.00' };
    cajaService.cerrar.mockReturnValue(
      of({ sesion: cerrada, desglose: { total_gastos: 15, total_abonos_cxc: 50, total_recargas_gc: 30, total_pagos_cxp: 10 } }),
    );
    cajaService.actual.mockReturnValue(
      of({ sesion: null, resumen: null, permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true } }),
    );
    fixture.componentInstance['montoFisico'].set(580);
    fixture.componentInstance.cerrarCaja();

    fixture.componentInstance.cerrarResumenDeCierre();

    expect(fixture.componentInstance['cajaRecienCerrada']()).toBeNull();
    expect(fixture.componentInstance['desgloseCierre']()).toBeNull();
  });

  it('un error al abrir la caja se reporta por toast, no por texto inline', async () => {
    await crearComponente({
      sesion: null,
      resumen: null,
      permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true },
    });
    cajaService.abrir.mockReturnValue(throwError(() => ({ error: { message: 'La caja ya está abierta.' } })));

    fixture.componentInstance['montoApertura'].set(500);
    fixture.componentInstance.abrirCaja();

    expect(toastService.error).toHaveBeenCalledWith('La caja ya está abierta.');
  });

  it('registrar un gasto exitosamente muestra un toast de exito', async () => {
    await crearComponente({
      sesion: sesionAbierta,
      resumen: { ventas_count: 0, total_ventas: 0, total_gastos: 0 },
      permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true },
    });
    gastoService.registrar.mockReturnValue(of({ id: 2, descripcion: 'Agua', monto: '40.00', fecha: '2026-07-22T11:00:00.000000Z' }));

    fixture.componentInstance['descripcionGasto'].set('Agua');
    fixture.componentInstance['montoGasto'].set(40);
    fixture.componentInstance.registrarGasto();

    expect(toastService.success).toHaveBeenCalled();
  });

  it('si la caja ya estaba cerrada, recarga el estado actual', async () => {
    await crearComponente({
      sesion: sesionAbierta,
      resumen: { ventas_count: 1, total_ventas: 100, total_gastos: 0 },
      permisos: { abrir: true, cerrar: true, gastos_ver: true, gastos_crear: true },
    });
    cajaService.cerrar.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: { message: 'La caja ya esta cerrada.', error_code: 'caja_ya_cerrada' },
          }),
      ),
    );

    fixture.componentInstance['montoFisico'].set(580);
    fixture.componentInstance.cerrarCaja();

    expect(toastService.error).toHaveBeenCalledWith('La caja ya esta cerrada.');
    expect(cajaService.actual).toHaveBeenCalledTimes(2);
  });
});
