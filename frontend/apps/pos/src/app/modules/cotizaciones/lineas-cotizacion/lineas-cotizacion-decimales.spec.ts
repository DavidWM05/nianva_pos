import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { proveedoresDePantalla } from '../../../testing/proveedores-pantalla';
import { BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../core/buscadores-entidad.tokens';
import { VentaService } from '../../tpv/venta.service';
import { LineasCotizacionComponent } from './lineas-cotizacion.component';

describe('Decimales de cotización', () => {
  it('suma los importes redondeados por línea con centavos enteros', async () => {
    await TestBed.configureTestingModule({
      imports: [LineasCotizacionComponent],
      providers: [
        ...proveedoresDePantalla(),
        { provide: VentaService, useValue: { cotizar: vi.fn() } },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: () => of([]) } },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: () => of([]) } },
      ],
    }).compileComponents();
    const componente = TestBed.createComponent(LineasCotizacionComponent).componentInstance;
    componente['lineas'].set([
      { variante_id: 1, etiqueta: 'Uno', cantidad: 1.5, precio_unitario: 0.01, descuento: 0 },
      { variante_id: 2, etiqueta: 'Dos', cantidad: 1.5, precio_unitario: 0.01, descuento: 0 },
    ]);
    expect(componente['subtotal']()).toBe(0.04);
  });
  it('redondea después del descuento cuando una línea queda en medio centavo negativo', async () => {
    await TestBed.configureTestingModule({
      imports: [LineasCotizacionComponent],
      providers: [
        ...proveedoresDePantalla(),
        { provide: VentaService, useValue: { cotizar: vi.fn() } },
        { provide: BUSCADOR_PRODUCTO, useValue: { buscar: () => of([]) } },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: () => of([]) } },
      ],
    }).compileComponents();
    const componente = TestBed.createComponent(LineasCotizacionComponent).componentInstance;
    componente['lineas'].set([
      { variante_id: 1, etiqueta: 'Uno', cantidad: 1.5, precio_unitario: 0.01, descuento: 0.02 },
      { variante_id: 2, etiqueta: 'Dos', cantidad: 1, precio_unitario: 0.02, descuento: 0 },
    ]);
    expect(componente['subtotal']()).toBe(0.01);
  });
});
