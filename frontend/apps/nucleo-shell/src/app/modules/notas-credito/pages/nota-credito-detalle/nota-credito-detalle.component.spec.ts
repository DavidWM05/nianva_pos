import { ComponentFixture, DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuditLogSource } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
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

import { NotaCreditoService } from '../../nota-credito.service';
import { NotaCredito } from '../../nota-credito.types';
import { NotaCreditoDetalleComponent } from './nota-credito-detalle.component';

describe('NotaCreditoDetalleComponent', () => {
  let fixture: ComponentFixture<NotaCreditoDetalleComponent>;
  let notaCreditoService: { obtener: ReturnType<typeof vi.fn> };

  function notaCon(overrides: Partial<NotaCredito>): NotaCredito {
    return {
      id: 5,
      cliente: { id: 9, nombre: 'Juan Pérez' },
      devolucion_id: 3,
      monto_original: '500.00',
      saldo_disponible: '300.00',
      fecha_expiracion: '2026-12-01',
      estado: 'usada_parcial',
      usos: [],
      created_at: '2026-07-27T10:00:00Z',
      ...overrides,
    };
  }

  async function crearComponente(nota: NotaCredito): Promise<void> {
    notaCreditoService = { obtener: vi.fn().mockReturnValue(of(nota)) };

    await TestBed.configureTestingModule({
      imports: [NotaCreditoDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: NotaCreditoService, useValue: notaCreditoService },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotaCreditoDetalleComponent);
    fixture.detectChanges();
  }

  it('carga la nota de crédito por id de la ruta y muestra sus datos', async () => {
    await crearComponente(notaCon({}));

    expect(notaCreditoService.obtener).toHaveBeenCalledWith(5);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Juan Pérez');
    expect(texto).toContain('300.00');
  });

  it('sin usos, muestra el mensaje de "no se ha usado todavía"', async () => {
    await crearComponente(notaCon({ usos: [] }));

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('no se ha usado todavía');
  });

  it('con usos, lista cada venta vinculada con su monto', async () => {
    await crearComponente(
      notaCon({
        usos: [{ id: 1, venta_id: 42, monto_usado: '200.00', created_at: '2026-07-20T10:00:00Z', venta: { id: 42, fecha: '2026-07-20T10:00:00Z', total: '200.00' } }],
      }),
    );

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Venta #42');
    expect(texto).toContain('200.00');
  });
});
