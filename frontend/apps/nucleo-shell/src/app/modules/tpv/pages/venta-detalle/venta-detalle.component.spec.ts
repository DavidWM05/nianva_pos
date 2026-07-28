import { ComponentFixture, DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuditLogSource } from '@nucleo/ui-shared';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom no implementa ResizeObserver -- lo usa PrimeNG's TabList detras de
// RecordTabsComponent (ver el mismo stub en cliente-detalle.component.spec.ts).
/* eslint-disable @typescript-eslint/no-empty-function */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
/* eslint-enable @typescript-eslint/no-empty-function */

import { VentaService } from '../../venta.service';
import { Venta } from '../../venta.types';
import { VentaDetalleComponent } from './venta-detalle.component';

describe('VentaDetalleComponent', () => {
  let fixture: ComponentFixture<VentaDetalleComponent>;

  const venta: Venta = {
    id: 42,
    fecha: '2026-07-01T10:00:00Z',
    cliente: { id: 1, nombre: 'Ana Pérez' },
    total: '150.00',
    descuento_cupon: '0.00',
    descuento_manual: '0.00',
    abono_previo: '0.00',
    estado: 'completada',
    motivo_anulacion: null,
    fecha_anulacion: null,
    es_venta_sombra: false,
    metodos_pago: [{ metodo_pago_id: 1, nombre: 'Efectivo', monto: '150.00' }],
    detalles: [
      {
        id: 1,
        variante_id: 10,
        variante: { id: 10, talla: 'M', color: 'Azul', producto_nombre: 'Playera' },
        cantidad: 2,
        precio_unitario: '75.00',
        descuento_aplicado: '0.00',
        subtotal: '150.00',
      },
    ],
  };

  async function crearComponente(ventaDevuelta: Venta): Promise<void> {
    const ventaService = { obtener: vi.fn().mockReturnValue(of(ventaDevuelta)) };

    await TestBed.configureTestingModule({
      imports: [VentaDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        provideRouter([]),
        { provide: VentaService, useValue: ventaService },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '42' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VentaDetalleComponent);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await crearComponente(venta);
  });

  it('renderiza las 3 pestañas, el cliente y el total', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Venta #42');
    expect(texto).toContain('Ana Pérez');
    expect(texto).toContain('General');
    expect(texto).toContain('Líneas');
    expect(texto).toContain('Auditoría');
  });

  it('el tab de Auditoría no renderiza nucleo-audit-log-viewer hasta que el bloque @defer se activa', async () => {
    const bloques = await fixture.getDeferBlocks();
    expect(bloques).toHaveLength(1);

    expect(fixture.nativeElement.querySelector('nucleo-audit-log-viewer')).toBeNull();

    await bloques[0].render(DeferBlockState.Complete);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nucleo-audit-log-viewer')).not.toBeNull();
  });

  it('una venta anulada muestra el motivo de anulacion, no el boton de Devolver', async () => {
    const ventaAnulada: Venta = { ...venta, estado: 'anulada', motivo_anulacion: 'Cliente cambió de opinión' };

    TestBed.resetTestingModule();
    await crearComponente(ventaAnulada);

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Cliente cambió de opinión');
    expect(texto).not.toContain('Devolver');
  });
});
