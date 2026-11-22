import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { DevolucionService } from '@nianva/domain-devoluciones';
import { MetodoPagoService, Venta, VentaService } from '@nianva/domain-tpv';
import { ToastService } from '@nianva/ui-shared';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../../core/buscadores-entidad.tokens';
import { AutorizacionSupervisorService } from '../../../../core/supervisor/autorizacion-supervisor.service';
import { proveedoresDePantalla } from '../../../../testing/proveedores-pantalla';
import { ulidDePrueba } from '../../../../testing/ulid-de-prueba';
import { DevolucionFormComponent } from './devolucion-form.component';

// Fase 4, B2 (SEG-05, F4-7): toda devolucion con reembolso en dinero pide supervisor. El
// supervisor autoriza la venta de origen y el cuerpo exacto; con el token se reintenta con la
// misma Idempotency-Key (API-07).

describe('DevolucionFormComponent (reembolso con supervisor)', () => {
  const ventaOrigen = {
    id: ulidDePrueba(55),
    numero: 55,
    cliente: { id: ulidDePrueba(9), nombre: 'Publico General' },
    total: '120.00',
    estado: 'completada',
    es_venta_sombra: false,
    detalles: [
      {
        id: ulidDePrueba(1),
        variante_id: 5,
        variante: { id: 5, nombre: 'M', producto_nombre: 'Camisa' },
        cantidad: '1.000',
        precio_unitario: '120.00',
        descuento_aplicado: '0.00',
        subtotal: '120.00',
      },
    ],
  } as unknown as Venta;

  it('pide devoluciones.reembolsar sobre la venta de origen con el cuerpo exacto y reintenta con la misma llave y el token', async () => {
    const registrar = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403, error: { error_code: 'supervisor_requerido', message: 'x' } })))
      .mockReturnValue(of({ devolucion: { id: ulidDePrueba(99) }, notaCredito: null }));
    TestBed.configureTestingModule({
      imports: [DevolucionFormComponent],
      providers: [
        ...proveedoresDePantalla(),
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: VentaService, useValue: { obtener: vi.fn().mockReturnValue(of(ventaOrigen)), cotizar: vi.fn().mockReturnValue(of({ items: [], subtotal: 0 })) } },
        { provide: DevolucionService, useValue: { registrar } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: MetodoPagoService, useValue: { listar: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Efectivo', tipo: 'efectivo' }])) } },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ venta_id: ventaOrigen.id }) } } },
      ],
    });
    const fixture = TestBed.createComponent(DevolucionFormComponent);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    fixture.componentInstance.actualizarCantidadDevuelta(0, 1);
    fixture.componentInstance['tipoReembolso'].set('efectivo');
    fixture.detectChanges();
    const lineasPago = fixture.debugElement.query(By.css('nucleo-lineas-pago'))?.componentInstance;
    lineasPago?.actualizarMetodoPago(0, 1);
    lineasPago?.actualizarMontoPago(0, 120);
    fixture.detectChanges();

    fixture.componentInstance.registrarDevolucion();
    const peticion = TestBed.inject(AutorizacionSupervisorService).pendiente();
    peticion?.resolver('token-1');

    const [primera, segunda] = registrar.mock.calls;
    expect(peticion?.solicitud).toMatchObject({ accion: 'devoluciones.reembolsar', recurso: ventaOrigen.id, datos: primera[0] });
    expect(primera[0]).toMatchObject({ venta_id: ventaOrigen.id, tipo_reembolso: 'efectivo' });
    expect(primera[1]).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(segunda).toEqual([primera[0], primera[1], 'token-1']);
  });
});
