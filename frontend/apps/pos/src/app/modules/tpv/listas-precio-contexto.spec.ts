import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { LineasProductoComponent } from './lineas-producto/lineas-producto.component';
import { VentaComponent } from './pages/venta/venta.component';
import { CajaService, CuponValidacionService, MetodoPagoService, VentaService } from '@nianva/domain-tpv';
import { NotaCreditoService } from '@nianva/domain-notas-credito';
import { SesionActualService } from '@nianva/domain-sesion';
import {
  BUSCADOR_CLIENTE,
  BUSCADOR_PRODUCTO,
  BUSCADOR_VARIANTE_DE_PRODUCTO,
  BUSCADOR_LISTA_PRECIO,
} from '../../core/buscadores-entidad.tokens';
const buscador = {
  buscar: () => of([]),
  obtener: () => of({ id: 1, nombre: 'Producto' }),
  hijosDe: () => of([{ id: 5, nombre: 'Variante' }]),
};
const cotizacion = {
  items: [
    {
      variante_id: 5,
      regla_precio_id: null,
      cantidad: '1.000',
      precio_unitario: '80.00',
      descuento_aplicado: '0.00',
      subtotal: '80.00',
    },
  ],
  subtotal: '80.00',
};
async function carrito(cotizar = vi.fn(() => of(cotizacion))) {
  await TestBed.configureTestingModule({
    imports: [LineasProductoComponent],
    providers: [
      ...proveedoresDePantalla(),
      { provide: VentaService, useValue: { cotizar } },
      { provide: BUSCADOR_PRODUCTO, useValue: buscador },
      { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: buscador },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(LineasProductoComponent);
  fixture.detectChanges();
  return { fixture, cotizar };
}
function agregar(component: LineasProductoComponent) {
  component.onProductoSeleccionado(1);
  component.onVarianteSeleccionada(5);
  component.agregarLinea();
}
describe('Contexto de listas en TPV', () => {
  it('cotiza con cliente y lista y vuelve a cotizar si cambia la lista', async () => {
    const { fixture, cotizar } = await carrito();
    fixture.componentRef.setInput('clienteId', 9);
    fixture.componentRef.setInput('listaPrecioId', 3);
    fixture.detectChanges();
    agregar(fixture.componentInstance);
    expect(cotizar).toHaveBeenLastCalledWith(
      [{ variante_id: 5, cantidad: 1 }],
      { cliente_id: 9, lista_precio_id: 3 },
    );
    fixture.componentRef.setInput('listaPrecioId', 4);
    fixture.detectChanges();
    expect(cotizar).toHaveBeenLastCalledWith(
      [{ variante_id: 5, cantidad: 1 }],
      { cliente_id: 9, lista_precio_id: 4 },
    );
  });
  it('una respuesta de la lista anterior no reemplaza el precio de la selección vigente', async () => {
    const anterior = new Subject<typeof cotizacion>(),
      actual = new Subject<typeof cotizacion>();
    const cotizar = vi
      .fn()
      .mockReturnValueOnce(anterior)
      .mockReturnValueOnce(actual);
    const { fixture } = await carrito(cotizar);
    agregar(fixture.componentInstance);
    fixture.componentRef.setInput('listaPrecioId', 4);
    fixture.detectChanges();
    actual.next(cotizacion);
    anterior.next({ ...cotizacion, subtotal: '100.00' });
    expect(fixture.componentInstance['subtotal']()).toBe(80);
  });
  it.each([true, false])(
    'el selector de lista solo se renderiza con permiso: %s',
    async (permiso) => {
      await TestBed.configureTestingModule({
        imports: [VentaComponent],
        providers: [
          ...proveedoresDePantalla(),
          {
            provide: VentaService,
            useValue: { cotizar: () => of(cotizacion) },
          },
          {
            provide: CajaService,
            useValue: { actual: () => of({ sesion: { id: 1 } }) },
          },
          { provide: MetodoPagoService, useValue: { listar: () => of([]) } },
          {
            provide: NotaCreditoService,
            useValue: { activasPorCliente: () => of([]) },
          },
          { provide: CuponValidacionService, useValue: { validar: vi.fn() } },
          {
            provide: SesionActualService,
            useValue: {
              sesion: () => ({
                permisos: permiso ? ['precios.elegir_lista'] : [],
              }),
            },
          },
          ...[
            BUSCADOR_CLIENTE,
            BUSCADOR_PRODUCTO,
            BUSCADOR_VARIANTE_DE_PRODUCTO,
            BUSCADOR_LISTA_PRECIO,
          ].map((provide) => ({ provide, useValue: buscador })),
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(VentaComponent);
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('nucleo-selector-lista-precio') !==
          null,
      ).toBe(permiso);
    },
  );
});
