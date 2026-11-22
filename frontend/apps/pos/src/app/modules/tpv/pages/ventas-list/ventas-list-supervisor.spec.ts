import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { Venta, VentaService } from '@nianva/domain-tpv';
import { ToastService } from '@nianva/ui-shared';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AutorizacionSupervisorService } from '../../../../core/supervisor/autorizacion-supervisor.service';
import { ulidDePrueba } from '../../../../testing/ulid-de-prueba';
import { VentasListComponent } from './ventas-list.component';

// Fase 4, B2 (SEG-05, F4-7): anular una venta pide supervisor. La anulacion lleva su
// Idempotency-Key (API-07) y, con el token, se reintenta el mismo motivo con la misma llave.

describe('VentasListComponent (anulacion con supervisor)', () => {
  const venta = { id: ulidDePrueba(1), folio: 'V-1-12', estado: 'completada' } as Venta;

  it('pide ventas.anular sobre la venta con el motivo exacto y reintenta con la misma llave y el token', async () => {
    const anular = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403, error: { error_code: 'supervisor_requerido', message: 'x' } })))
      .mockReturnValue(of({ ...venta, estado: 'anulada' }));
    TestBed.configureTestingModule({
      imports: [VentasListComponent],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: VentaService, useValue: { listar: vi.fn().mockReturnValue(of({ data: [], total: 0, permisos: { anular: true } })), anular } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(VentasListComponent);
    fixture.detectChanges();

    fixture.componentInstance.abrirAnulacion(venta);
    fixture.componentInstance['motivoAnulacion'].set('Cliente se arrepintió');
    fixture.componentInstance.confirmarAnulacion();
    const peticion = TestBed.inject(AutorizacionSupervisorService).pendiente();
    peticion?.resolver('token-1');

    expect(peticion?.solicitud).toMatchObject({ accion: 'ventas.anular', recurso: venta.id, datos: { motivo: 'Cliente se arrepintió' } });
    expect(peticion?.solicitud.descripcion).toBe('Anular la venta V-1-12');
    const [primera, segunda] = anular.mock.calls;
    expect(primera[2]).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(primera[3]).toBeUndefined();
    expect(segunda).toEqual([venta.id, 'Cliente se arrepintió', primera[2], 'token-1']);
    expect(fixture.componentInstance['anulando']()).toBe(false);
  });
});
