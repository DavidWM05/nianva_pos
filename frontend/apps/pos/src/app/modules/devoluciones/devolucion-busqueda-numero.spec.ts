import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { DevolucionService } from '@nianva/domain-devoluciones';
import { MetodoPagoService, VentaService } from '@nianva/domain-tpv';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../core/buscadores-entidad.tokens';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { ulidDePrueba } from '../../testing/ulid-de-prueba';
import { DevolucionFormComponent } from './pages/devolucion-form/devolucion-form.component';

/**
 * DAT-08 / DAT-07: la devolución busca la venta por su folio. El backend responde el ulid y la
 * pantalla carga la venta con él; nunca pide /ventas/<folio>.
 */
describe('Devolución: búsqueda de la venta por folio (DAT-07)', () => {
  const venta = { id: ulidDePrueba(42), folio: 'V-1-42', es_venta_sombra: false, total: '100.00', cliente: null, detalles: [] };
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

  it('resuelve el folio a su ulid y carga la venta con ese ulid', async () => {
    const buscarPorFolio = vi.fn().mockReturnValue(of(ulidDePrueba(42)));
    const obtener = vi.fn().mockReturnValue(of(venta));
    const { fixture } = await crear({ buscarPorFolio, obtener });

    fixture.componentInstance['folioBusqueda'].set('V-1-42');
    fixture.componentInstance.buscarVenta();

    expect(buscarPorFolio).toHaveBeenCalledWith('V-1-42');
    expect(obtener).toHaveBeenCalledWith(ulidDePrueba(42));
    expect(fixture.componentInstance['ventaOrigen']()).toEqual(venta);
  });

  it('si el folio no existe avisa y no carga ninguna venta', async () => {
    const buscarPorFolio = vi.fn().mockReturnValue(of(null));
    const obtener = vi.fn();
    const { fixture, toast } = await crear({ buscarPorFolio, obtener });

    fixture.componentInstance['folioBusqueda'].set('V-9-999');
    fixture.componentInstance.buscarVenta();

    expect(obtener).not.toHaveBeenCalled();
    expect(fixture.componentInstance['ventaOrigen']()).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('No se encontró la venta o no tienes permiso para verla.');
  });
});
