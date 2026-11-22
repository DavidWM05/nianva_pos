import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { CajaService, GastoService } from '@nianva/domain-tpv';
import { ToastService } from '@nianva/ui-shared';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AutorizacionSupervisorService } from '../../../../core/supervisor/autorizacion-supervisor.service';
import { ulidDePrueba } from '../../../../testing/ulid-de-prueba';
import { CajaComponent } from './caja.component';

// Fase 4, B2: cerrar la caja con un descuadre arriba del umbral pide supervisor (SEG-05, F4-7);
// el umbral lo conoce el servidor. Abrir, cerrar y registrar un gasto llevan Idempotency-Key.

describe('CajaComponent (supervisor e idempotencia)', () => {
  const sesion = {
    id: ulidDePrueba(3),
    sucursal_id: 1,
    usuario_id: 1,
    estado: 'abierta',
    monto_apertura: '50.00',
    monto_cierre: null,
    total_ventas_sistema: null,
    diferencia: null,
    fecha_apertura: '2026-11-20T12:00:00Z',
    fecha_cierre: null,
  };
  const metodos = [{ metodo_pago_id: 1, nombre: 'Efectivo', total_teorico: '90.00' }];
  const estado = {
    sesion,
    resumen: { ventas_count: 1, total_ventas: '90.00', total_gastos: '0.00', metodos },
    permisos: { abrir: true, cerrar: true, gastos_ver: false, gastos_crear: true },
  };

  function montar(caja: Record<string, ReturnType<typeof vi.fn>>, gastos: Record<string, ReturnType<typeof vi.fn>> = {}) {
    TestBed.configureTestingModule({
      imports: [CajaComponent],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: CajaService, useValue: { actual: () => of(estado), ...caja } },
        { provide: GastoService, useValue: { listar: () => of([]), ...gastos } },
        { provide: ToastService, useValue: { error: vi.fn(), success: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(CajaComponent);
    fixture.detectChanges();

    return fixture;
  }

  it('cerrar con descuadre pide caja.cerrar sobre la sesion con los conteos exactos y reintenta con la misma llave y el token', () => {
    const cerrar = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403, error: { error_code: 'supervisor_requerido', message: 'x' } })))
      .mockReturnValue(of({ sesion: { ...sesion, estado: 'cerrada' }, desglose: { total_gastos: '0.00', total_abonos_cxc: '0.00', total_recargas_gc: '0.00', total_pagos_cxp: '0.00' } }));
    const fixture = montar({ cerrar });
    const entrada = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#caja-conteo-1')!;
    entrada.value = '20';
    entrada.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.componentInstance.cerrarCaja();
    const peticion = TestBed.inject(AutorizacionSupervisorService).pendiente();
    peticion?.resolver('token-1');

    const conteos = [{ metodo_pago_id: 1, monto: 20 }];
    expect(peticion?.solicitud).toMatchObject({ accion: 'caja.cerrar', recurso: sesion.id, datos: { conteos } });
    const [primera, segunda] = cerrar.mock.calls;
    expect(primera[2]).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(segunda).toEqual([sesion.id, conteos, primera[2], 'token-1']);
  });

  it('un gasto que falla sin respuesta se reenvia con la misma llave; tras confirmarse, el siguiente lleva otra', () => {
    const registrar = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })))
      .mockReturnValue(of({ id: 1 }));
    const fixture = montar({}, { registrar });
    const enviar = () => {
      fixture.componentInstance['descripcionGasto'].set('Agua');
      fixture.componentInstance['montoGasto'].set(40);
      fixture.componentInstance.registrarGasto();
    };

    enviar();
    enviar();
    enviar();

    const llaves = registrar.mock.calls.map((llamada) => llamada[2]);
    expect(llaves[0]).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(llaves[1]).toBe(llaves[0]);
    expect(llaves[2]).not.toBe(llaves[1]);
  });
});
