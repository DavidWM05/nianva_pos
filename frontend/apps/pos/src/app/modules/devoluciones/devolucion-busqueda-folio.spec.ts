import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DevolucionService } from '@nianva/domain-devoluciones';
import { MetodoPagoService, VentaService } from '@nianva/domain-tpv';
import { ToastService } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../core/buscadores-entidad.tokens';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { ulidDePrueba } from '../../testing/ulid-de-prueba';
import { DevolucionFormComponent } from './pages/devolucion-form/devolucion-form.component';

/**
 * Fase 4, B3 (DAT-07, F4-5): la devolución busca la venta por su folio (`filtro_folio`). El
 * servidor responde el ulid y la pantalla carga la venta con él; el campo muestra el folio.
 */
describe('Devolución: búsqueda de la venta por folio (DAT-07)', () => {
  const venta = { id: ulidDePrueba(42), numero: 42, folio: 'V-1-42', es_venta_sombra: false, total: '100.00', cliente: null, detalles: [] };
  const buscador = { buscar: () => of([]), obtener: () => of({ id: 1, nombre: 'Entidad' }), hijosDe: () => of([]) };

  async function crear(ventaService: Partial<Record<'buscarPorFolio' | 'obtener', unknown>>) {
    const toast = { success: vi.fn(), error: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [DevolucionFormComponent],
      providers: [
        ...proveedoresDePantalla(),
        { provide: VentaService, useValue: ventaService },
        { provide: DevolucionService, useValue: { registrar: vi.fn() } },
        { provide: MetodoPagoService, useValue: { listar: () => of([]) } },
        { provide: ToastService, useValue: toast },
        { provide: BUSCADOR_PRODUCTO, useValue: buscador },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: buscador },
      ],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(DevolucionFormComponent);
    fixture.detectChanges();

    return { fixture, toast };
  }

  function escribirFolio(fixture: Awaited<ReturnType<typeof crear>>['fixture'], folio: string): HTMLInputElement {
    const entrada = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="text"]')!;
    entrada.value = folio;
    entrada.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    return entrada;
  }

  it('el campo se llama "Folio de la venta" y acepta texto', async () => {
    const { fixture } = await crear({ buscarPorFolio: vi.fn(), obtener: vi.fn() });

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Folio de la venta');
    expect((fixture.nativeElement as HTMLElement).querySelector('input[type="number"]')).toBeNull();
  });

  it('Enter en el campo resuelve el folio (sin espacios) a su ulid, carga la venta y deja el folio en el campo', async () => {
    const buscarPorFolio = vi.fn().mockReturnValue(of(ulidDePrueba(42)));
    const obtener = vi.fn().mockReturnValue(of(venta));
    const { fixture } = await crear({ buscarPorFolio, obtener });

    const entrada = escribirFolio(fixture, '  V-1-42 ');
    entrada.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(buscarPorFolio).toHaveBeenCalledWith('V-1-42');
    expect(obtener).toHaveBeenCalledWith(ulidDePrueba(42));
    expect(fixture.componentInstance['folioBusqueda']()).toBe('V-1-42');
  });

  it('si el folio no existe avisa y no carga ninguna venta', async () => {
    const buscarPorFolio = vi.fn().mockReturnValue(of(null));
    const obtener = vi.fn();
    const { fixture, toast } = await crear({ buscarPorFolio, obtener });

    escribirFolio(fixture, 'V-9-999');
    fixture.componentInstance.buscarVenta();

    expect(obtener).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('No se encontró la venta o no tienes permiso para verla.');
  });

  it('con el campo vacio no busca', async () => {
    const buscarPorFolio = vi.fn();
    const { fixture } = await crear({ buscarPorFolio, obtener: vi.fn() });

    escribirFolio(fixture, '   ');
    fixture.componentInstance.buscarVenta();

    expect(buscarPorFolio).not.toHaveBeenCalled();
  });
});
