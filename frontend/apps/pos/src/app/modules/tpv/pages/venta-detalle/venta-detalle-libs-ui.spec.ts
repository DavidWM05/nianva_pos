import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuditLogSource } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { proveedoresDePantalla } from '../../../../testing/proveedores-pantalla';
import { VentaService } from '../../venta.service';
import { Venta } from '../../venta.types';
import { VentaDetalleComponent } from './venta-detalle.component';

// Cierre de la Fase 2: el detalle de venta usa ui-page-header (nombre por clave), ui-badge
// (REGISTRO_ESTADOS) y ui-tabla para las lineas, como los demas detalles migrados.
describe('VentaDetalleComponent con libs/ui', () => {
  const venta: Venta = {
    id: 42,
    fecha: '2026-07-01T10:00:00Z',
    cliente: { id: 1, nombre: 'Ana' },
    total: '1500.00',
    descuento_cupon: '0.00',
    descuento_manual: '0.00',
    abono_previo: '0.00',
    estado: 'completada',
    motivo_anulacion: null,
    fecha_anulacion: null,
    es_venta_sombra: false,
    metodos_pago: [{ metodo_pago_id: 1, nombre: 'Efectivo', monto: '1500.00' }],
    detalles: [
      {
        id: 1,
        variante_id: 10,
        variante: { id: 10, talla: 'M', color: 'Azul', producto_nombre: 'Playera' },
        cantidad: 2,
        precio_unitario: '750.00',
        descuento_aplicado: '0.00',
        subtotal: '1500.00',
      },
    ],
  };

  async function crear(dada: Venta): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [VentaDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        ...proveedoresDePantalla(),
        { provide: VentaService, useValue: { obtener: vi.fn().mockReturnValue(of(dada)) } },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '42' }) } } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(VentaDetalleComponent);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('el encabezado es ui-page-header con el nombre del registro de navegacion, y la venta va como subtitulo propio', async () => {
    const raiz = await crear(venta);

    expect(raiz.querySelectorAll('h1')).toHaveLength(1);
    expect(raiz.querySelector('ui-page-header h1')?.textContent?.trim()).toBe('Ventas');
    expect([...raiz.querySelectorAll('h2')].map((h) => h.textContent?.trim())).toContain('Venta #42');
  });

  it('una venta anulada pinta ui-badge en tono peligro; una completada no pinta badge', async () => {
    const anulada = await crear({ ...venta, estado: 'anulada', motivo_anulacion: 'Error' });
    const badge = anulada.querySelector('ui-badge .ui-badge');

    expect(badge?.classList.contains('ui-badge--peligro')).toBe(true);
    expect(badge?.textContent?.trim()).toBe('Anulada');
    expect(anulada.querySelector('nucleo-status-badge')).toBeNull();

    TestBed.resetTestingModule();
    const completada = await crear(venta);

    expect(completada.querySelector('ui-badge .ui-badge')).toBeNull();
  });

  it('las lineas van en ui-tabla con dinero y cantidad', async () => {
    const raiz = await crear(venta);
    const tabla = raiz.querySelector('ui-tabla');

    expect(tabla).not.toBeNull();
    expect(tabla?.textContent).toContain('Playera (M / Azul)');
    expect(tabla?.textContent).toContain('$750.00');
    expect(tabla?.textContent).toContain('$1,500.00');
  });
});
