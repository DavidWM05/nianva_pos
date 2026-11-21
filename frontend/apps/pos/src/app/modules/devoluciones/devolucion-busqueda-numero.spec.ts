import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
 * DAT-08 / D-7: la devolución busca la venta por su `numero` (transitorio hasta el folio de
 * DAT-07). El backend responde el ulid y la pantalla carga la venta con él; nunca pide
 * /ventas/<numero>.
 */
describe('Devolución: búsqueda de la venta por número (D-7)', () => {
  const venta = { id: ulidDePrueba(42), numero: 42, es_venta_sombra: false, total: '100.00', cliente: null, detalles: [] };
  const buscador = { buscar: () => of([]), obtener: () => of({ id: 1, nombre: 'Entidad' }), hijosDe: () => of([]) };

  async function crear(ventaService: Partial<Record<'buscarPorNumero' | 'obtener', unknown>>) {
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

  it('resuelve el número a su ulid y carga la venta con ese ulid', async () => {
    const buscarPorNumero = vi.fn().mockReturnValue(of(ulidDePrueba(42)));
    const obtener = vi.fn().mockReturnValue(of(venta));
    const { fixture } = await crear({ buscarPorNumero, obtener });

    fixture.componentInstance['ventaIdBusqueda'].set(42);
    fixture.componentInstance.buscarVenta();

    expect(buscarPorNumero).toHaveBeenCalledWith(42);
    expect(obtener).toHaveBeenCalledWith(ulidDePrueba(42));
    expect(fixture.componentInstance['ventaOrigen']()).toEqual(venta);
  });

  it('si el número no existe avisa y no carga ninguna venta', async () => {
    const buscarPorNumero = vi.fn().mockReturnValue(of(null));
    const obtener = vi.fn();
    const { fixture, toast } = await crear({ buscarPorNumero, obtener });

    fixture.componentInstance['ventaIdBusqueda'].set(999);
    fixture.componentInstance.buscarVenta();

    expect(obtener).not.toHaveBeenCalled();
    expect(fixture.componentInstance['ventaOrigen']()).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('No se encontró la venta o no tienes permiso para verla.');
  });
});

describe('VentaService.buscarPorNumero (D-7)', () => {
  it('pide /ventas con filtro_numero y devuelve el ulid de la primera fila, o null', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const servicio = TestBed.inject(VentaService);
    const http = TestBed.inject(HttpTestingController);

    let encontrado: string | null | undefined;
    servicio.buscarPorNumero(42).subscribe((ulid) => (encontrado = ulid));
    const peticion = http.expectOne((r) => r.url.endsWith('/ventas'));
    expect(peticion.request.params.get('filtro_numero')).toBe('42');
    peticion.flush({ data: [{ id: ulidDePrueba(42), numero: 42 }], meta: { total: 1, permisos: { anular: false } } });
    expect(encontrado).toBe(ulidDePrueba(42));

    let vacio: string | null | undefined;
    servicio.buscarPorNumero(7).subscribe((ulid) => (vacio = ulid));
    http.expectOne((r) => r.url.endsWith('/ventas')).flush({ data: [], meta: { total: 0, permisos: { anular: false } } });
    expect(vacio).toBeNull();
    http.verify();
  });
});
