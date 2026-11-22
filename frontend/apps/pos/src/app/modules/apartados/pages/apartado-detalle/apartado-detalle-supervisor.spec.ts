import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Apartado, ApartadoService } from '@nianva/domain-apartados';
import { MetodoPagoService } from '@nianva/domain-tpv';
import { AuditLogSource, ToastService } from '@nianva/ui-shared';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AutorizacionSupervisorService } from '../../../../core/supervisor/autorizacion-supervisor.service';
import { proveedoresDePantalla } from '../../../../testing/proveedores-pantalla';
import { ulidDePrueba } from '../../../../testing/ulid-de-prueba';
import { ApartadoDetalleComponent } from './apartado-detalle.component';

// Fase 4, B2: cancelar un apartado pide supervisor (SEG-05, F4-7) y lleva su Idempotency-Key
// (API-07). El abono y la liquidacion tambien llevan llave, y una nueva tras confirmar.

/* eslint-disable @typescript-eslint/no-empty-function */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
/* eslint-enable @typescript-eslint/no-empty-function */

describe('ApartadoDetalleComponent (supervisor e idempotencia)', () => {
  const apartado = {
    id: ulidDePrueba(7),
    numero: 7,
    fecha_creacion: '2026-07-01T10:00:00.000000Z',
    cliente: { id: ulidDePrueba(9), nombre: 'Maria Lopez' },
    total: '600.00',
    total_abonado: '600.00',
    estado: 'activo',
    fecha_vencimiento: '2026-08-01',
    fecha_completado: null,
    fecha_cancelado: null,
    motivo_cancelacion: null,
    venta_id: null,
    notas: null,
    detalles: [],
    abonos: [],
  } as unknown as Apartado;

  function montar(servicio: Partial<Record<'cancelar' | 'liquidar', ReturnType<typeof vi.fn>>>) {
    TestBed.configureTestingModule({
      imports: [ApartadoDetalleComponent],
      providers: [
        ...proveedoresDePantalla(),
        provideAnimationsAsync(),
        { provide: ApartadoService, useValue: { obtener: vi.fn().mockReturnValue(of({ apartado, permisos: { abonar: true, cancelar: true } })), ...servicio } },
        { provide: MetodoPagoService, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: String(apartado.id) }) } } },
      ],
    });
    const fixture = TestBed.createComponent(ApartadoDetalleComponent);
    fixture.detectChanges();

    return fixture;
  }

  it('cancelar pide apartados.cancelar con el motivo y reintenta con la misma llave y el token', () => {
    const cancelar = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403, error: { error_code: 'supervisor_requerido', message: 'x' } })))
      .mockReturnValue(of({ apartado: { ...apartado, estado: 'cancelado' }, tieneAbonosPendientes: false, montoAbonadoPendiente: 0 }));
    const fixture = montar({ cancelar });

    fixture.componentInstance['motivoCancelacion'].set('Cliente se arrepintio');
    fixture.componentInstance.confirmarCancelacion();
    const peticion = TestBed.inject(AutorizacionSupervisorService).pendiente();
    peticion?.resolver('token-1');

    expect(peticion?.solicitud).toMatchObject({ accion: 'apartados.cancelar', recurso: apartado.id, datos: { motivo: 'Cliente se arrepintio' } });
    const [primera, segunda] = cancelar.mock.calls;
    expect(primera[2]).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(segunda).toEqual([apartado.id, 'Cliente se arrepintio', primera[2], 'token-1']);
  });

  it('liquidar manda llave; tras confirmar, la siguiente liquidacion lleva otra', () => {
    const liquidar = vi.fn().mockReturnValue(of(apartado));
    const fixture = montar({ liquidar });

    fixture.componentInstance.liquidar();
    fixture.componentInstance.liquidar();

    const [primera, segunda] = liquidar.mock.calls;
    expect(primera[1]).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(segunda[1]).not.toBe(primera[1]);
  });
});
