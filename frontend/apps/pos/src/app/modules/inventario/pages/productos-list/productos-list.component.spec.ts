import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ConfirmDialogService, ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { ProductoService } from '../../producto.service';
import { Producto, ProductosPagina } from '../../producto.types';
import { ProductosListComponent } from './productos-list.component';

describe('ProductosListComponent', () => {
  let fixture: ComponentFixture<ProductosListComponent>;
  let productoService: { listar: ReturnType<typeof vi.fn>; categorias: ReturnType<typeof vi.fn>; departamentos: ReturnType<typeof vi.fn> };

  const productos: Producto[] = [
    {
      id: 1,
      nombre: 'Playera Básica',
      descripcion: null,
      categoria: { id: 1, nombre: 'Playeras' },
      departamento: null,
      precio_compra: '80.00',
      precio_venta: '150.00',
      imagen_url: null,
      no_resurtible: false,
      sin_descuento: false,
      activo: true,
      stock_total: 23,
    },
    {
      id: 2,
      nombre: 'Pantalón Cargo',
      descripcion: null,
      categoria: null,
      departamento: null,
      precio_compra: '200.00',
      precio_venta: '399.00',
      imagen_url: null,
      no_resurtible: false,
      sin_descuento: false,
      activo: false,
      stock_total: 0,
    },
  ];

  function paginaCon(permisos: ProductosPagina['permisos']): ProductosPagina {
    return { data: productos, total: productos.length, permisos };
  }

  async function crearComponente(permisos: ProductosPagina['permisos']): Promise<void> {
    productoService = {
      listar: vi.fn().mockReturnValue(of(paginaCon(permisos))),
      categorias: vi.fn().mockReturnValue(of([])),
      departamentos: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [ProductosListComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: ProductoService, useValue: productoService },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductosListComponent);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('renderiza los productos con su columna de stock total', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Playera Básica');
    expect(texto).toContain('Playeras');
    expect(texto).toContain('23');
    expect(texto).toContain('Pantalón Cargo');
    expect(texto).toContain('0');
  });

  it('"Nuevo producto" navega a la vista dedicada, no abre un modal', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    const enlace = (fixture.nativeElement as HTMLElement).querySelector('a[href="/inventario/productos/nuevo"]');
    expect(enlace).not.toBeNull();
  });

  it('oculta "Nuevo producto" sin el permiso inventario.crear', async () => {
    await crearComponente({ crear: false, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nuevo producto');
  });

  it('sin el permiso inventario.editar, ninguna fila muestra el boton de editar', async () => {
    await crearComponente({ crear: true, editar: false, eliminar: true });

    const botones = (fixture.nativeElement as HTMLElement).querySelectorAll('[aria-label="Editar"]');
    expect(botones.length).toBe(0);
  });

  it('sin el permiso inventario.eliminar, ninguna fila muestra el boton de desactivar', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: false });

    const botones = (fixture.nativeElement as HTMLElement).querySelectorAll('[aria-label="Desactivar"]');
    expect(botones.length).toBe(0);
  });
});
