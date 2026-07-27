import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuditLogSource } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

// jsdom (el entorno de estos tests) no implementa ResizeObserver -- lo usa
// PrimeNG's TabList (detras de RecordTabsComponent) en ngAfterViewInit.
// Mismo stub que cliente-detalle.component.spec.ts / apartado-detalle.component.spec.ts.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

import { DevolucionService } from '../../devolucion.service';
import { Devolucion } from '../../devolucion.types';
import { DevolucionDetalleComponent } from './devolucion-detalle.component';

describe('DevolucionDetalleComponent', () => {
  let fixture: ComponentFixture<DevolucionDetalleComponent>;

  const devolucionCambio: Devolucion = {
    id: 3,
    fecha: '2026-07-22T10:00:00.000000Z',
    tipo: 'cambio',
    venta: { id: 55, cliente_nombre: 'Publico General' },
    venta_sombra_id: 99,
    monto_devolucion: '120.00',
    monto_cambio: '400.00',
    diferencia: '280.00',
    motivo: 'Cliente prefirió el saco',
    items: [
      {
        id: 1,
        tipo: 'devuelto',
        variante_id: 5,
        variante: { id: 5, talla: 'M', color: null, producto_nombre: 'Camisa' },
        cantidad: 1,
        precio_unitario: '120.00',
        subtotal: '120.00',
        va_a_merma: false,
      },
      {
        id: 2,
        tipo: 'nuevo',
        variante_id: 8,
        variante: { id: 8, talla: 'L', color: null, producto_nombre: 'Saco' },
        cantidad: 1,
        precio_unitario: '400.00',
        subtotal: '400.00',
        va_a_merma: false,
      },
    ],
    pagos: [{ metodo_pago_id: 1, nombre: 'Efectivo', monto: '280.00' }],
  };

  async function crearComponente(devolucion: Devolucion): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DevolucionDetalleComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: DevolucionService, useValue: { obtener: vi.fn().mockReturnValue(of(devolucion)) } },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: String(devolucion.id) }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DevolucionDetalleComponent);
    fixture.detectChanges();
  }

  it('muestra el cobro adicional y el link a la venta sombra generada', async () => {
    await crearComponente(devolucionCambio);

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('+$280.00 (cobro adicional)');
    expect(texto).toContain('Venta #99');
    expect(texto).toContain('Saco');
    expect(texto).not.toContain('Merma'); // ninguna linea de este ejemplo va a merma
  });

  it('marca las lineas devueltas que van a merma', async () => {
    await crearComponente({
      ...devolucionCambio,
      items: [{ ...devolucionCambio.items![0], va_a_merma: true }],
    });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Merma');
  });
});
