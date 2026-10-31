import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuditLogSource, ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

// jsdom no implementa ResizeObserver -- lo usa PrimeNG's TabList (detras de
// RecordTabsComponent) en ngAfterViewInit. Mismo stub que
// cotizacion-detalle.component.spec.ts.
/* eslint-disable @typescript-eslint/no-empty-function */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
/* eslint-enable @typescript-eslint/no-empty-function */

import { BUSCADOR_USUARIO } from '../../../../core/buscadores-entidad.tokens';
import { PedidoService } from '../../pedido.service';
import { Pedido } from '../../pedido.types';
import { PedidoDetalleComponent } from './pedido-detalle.component';

describe('PedidoDetalleComponent', () => {
  let fixture: ComponentFixture<PedidoDetalleComponent>;
  let pedidoService: { obtener: ReturnType<typeof vi.fn>; cambiarEstado: ReturnType<typeof vi.fn>; asignarRepartidor: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  function pedidoCon(overrides: Partial<Pedido>): Pedido {
    return {
      id: 5,
      numero_pedido: 'PED-000005',
      cliente: { id: 9, nombre: 'Juan Pérez' },
      repartidor: null,
      direccion_entrega: 'Calle Falsa 123',
      costo_delivery: '30.00',
      estado: 'pendiente',
      tiempo_estimado: 45,
      notas: null,
      fecha_entrega: null,
      items: [],
      created_at: '2026-07-27T10:00:00Z',
      ...overrides,
    };
  }

  async function crearComponente(pedido: Pedido): Promise<void> {
    pedidoService = {
      obtener: vi.fn().mockReturnValue(of(pedido)),
      cambiarEstado: vi.fn(),
      asignarRepartidor: vi.fn(),
    };
    toast = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [PedidoDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: PedidoService, useValue: pedidoService },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: BUSCADOR_USUARIO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
        { provide: ToastService, useValue: toast },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PedidoDetalleComponent);
    fixture.detectChanges();
  }

  it('pendiente: transicionesDisponibles() es preparando y cancelado', async () => {
    await crearComponente(pedidoCon({ estado: 'pendiente' }));

    expect(fixture.componentInstance['transicionesDisponibles']()).toEqual(['preparando', 'cancelado']);
  });

  it('entregado: transicionesDisponibles() esta vacio (estado terminal)', async () => {
    await crearComponente(pedidoCon({ estado: 'entregado' }));

    expect(fixture.componentInstance['transicionesDisponibles']()).toEqual([]);
  });

  it('entregado: puedeAsignarRepartidor() es falso', async () => {
    await crearComponente(pedidoCon({ estado: 'entregado' }));

    expect(fixture.componentInstance['puedeAsignarRepartidor']()).toBe(false);
  });

  it('cambiarEstado() llama al backend y actualiza el pedido mostrado con la respuesta', async () => {
    await crearComponente(pedidoCon({ estado: 'pendiente' }));
    pedidoService.cambiarEstado.mockReturnValue(of(pedidoCon({ estado: 'preparando' })));

    fixture.componentInstance.cambiarEstado('preparando');

    expect(pedidoService.cambiarEstado).toHaveBeenCalledWith(5, 'preparando');
    expect(fixture.componentInstance['pedido']()?.estado).toBe('preparando');
    expect(toast.success).toHaveBeenCalledWith('Pedido marcado como "Preparando".');
  });

  it('cambiarEstado() con transicion invalida muestra el mensaje real del backend', async () => {
    await crearComponente(pedidoCon({ estado: 'entregado' }));
    pedidoService.cambiarEstado.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { message: 'No se puede pasar de entregado a preparando.', error_code: 'transicion_estado_invalida' } })),
    );

    fixture.componentInstance.cambiarEstado('preparando');

    expect(toast.error).toHaveBeenCalledWith('No se puede pasar de entregado a preparando.');
  });

  it('asignarRepartidor() llama al backend y actualiza el pedido mostrado', async () => {
    await crearComponente(pedidoCon({ estado: 'pendiente' }));
    pedidoService.asignarRepartidor.mockReturnValue(of(pedidoCon({ repartidor: { id: 4, nombre: 'Pedro' } })));

    fixture.componentInstance.asignarRepartidor(4);

    expect(pedidoService.asignarRepartidor).toHaveBeenCalledWith(5, 4);
    expect(fixture.componentInstance['pedido']()?.repartidor).toEqual({ id: 4, nombre: 'Pedro' });
    expect(toast.success).toHaveBeenCalledWith('Repartidor asignado.');
  });
});
