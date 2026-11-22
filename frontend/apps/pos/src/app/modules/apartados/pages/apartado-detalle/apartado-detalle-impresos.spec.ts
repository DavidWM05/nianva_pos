import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Apartado, ApartadoService } from '@nianva/domain-apartados';
import { MetodoPagoService } from '@nianva/domain-tpv';
import { AuditLogSource, ToastService } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { ImprimirDocumentoService } from '../../../../core/impresos/imprimir-documento.service';
import { proveedoresDePantalla } from '../../../../testing/proveedores-pantalla';
import { ulidDePrueba } from '../../../../testing/ulid-de-prueba';
import { ApartadoDetalleComponent } from './apartado-detalle.component';

// Fase 4, B3 (UI-12, F4-4): el apartado muestra su folio y cada abono se imprime como comprobante
// (un abono se identifica con el folio de su documento y su fecha; no hay serie de recibos).

/* eslint-disable @typescript-eslint/no-empty-function */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
/* eslint-enable @typescript-eslint/no-empty-function */

describe('ApartadoDetalleComponent (folio y comprobante de abono)', () => {
  const apartado = {
    id: ulidDePrueba(7),
    numero: 7,
    folio: 'A-1-7',
    fecha_creacion: '2026-07-01T10:00:00.000000Z',
    cliente: { id: ulidDePrueba(9), nombre: 'Maria Lopez' },
    total: '600.00',
    total_abonado: '100.00',
    estado: 'activo',
    fecha_vencimiento: '2026-08-01',
    detalles: [],
    abonos: [{ id: ulidDePrueba(30), monto: '100.00', fecha: '2026-07-02T10:00:00Z', notas: null, pagos: [] }],
  } as unknown as Apartado;

  async function montar(disponible: boolean) {
    const impresion = { disponible, imprimiendo: signal(false), imprimir: vi.fn(() => of(undefined)) };
    await TestBed.configureTestingModule({
      imports: [ApartadoDetalleComponent],
      providers: [
        ...proveedoresDePantalla(),
        provideAnimationsAsync(),
        { provide: ImprimirDocumentoService, useValue: impresion },
        { provide: ApartadoService, useValue: { obtener: vi.fn().mockReturnValue(of({ apartado, permisos: { abonar: true, cancelar: true } })) } },
        { provide: MetodoPagoService, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: String(apartado.id) }) } } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ApartadoDetalleComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return { raiz: fixture.nativeElement as HTMLElement, impresion };
  }

  it('el encabezado muestra el folio del apartado', async () => {
    const { raiz } = await montar(true);

    expect(raiz.querySelector('h2')?.textContent).toContain('Apartado A-1-7');
  });

  it('cada abono ofrece imprimir su comprobante con el ancho de ticket de la terminal', async () => {
    const { raiz, impresion } = await montar(true);

    raiz.querySelector<HTMLButtonElement>('button[aria-label="Imprimir"]')!.click();

    expect(impresion.imprimir).toHaveBeenCalledWith({ tipo: 'abono', apartado: ulidDePrueba(7), abono: ulidDePrueba(30) }, 'ticket-80');
  });

  it('sin impresos publicados, la tabla de abonos no tiene columna de comprobante', async () => {
    const { raiz } = await montar(false);

    expect(raiz.querySelector('button[aria-label="Imprimir"]')).toBeNull();
    expect(raiz.textContent).not.toContain('Comprobante');
  });
});
