import { ComponentFixture, DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuditLogSource, DynamicFormComponent, ToastService } from '@nucleo/ui-shared';
import { ConfirmationService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CompraService } from '../../compra.service';
import { ConfiguracionService } from '../../../configuracion/configuracion.service';
import { ProductoService } from '../../producto.service';
import { Producto } from '../../producto.types';
import { ProductoDetalleComponent } from './producto-detalle.component';

// jsdom no implementa ResizeObserver -- lo usa PrimeNG's TabList detras de
// RecordTabsComponent (ver el mismo stub en cliente-detalle.component.spec.ts).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

describe('ProductoDetalleComponent', () => {
  let fixture: ComponentFixture<ProductoDetalleComponent>;
  let productoService: {
    obtener: ReturnType<typeof vi.fn>;
    categorias: ReturnType<typeof vi.fn>;
    departamentos: ReturnType<typeof vi.fn>;
    kardex: ReturnType<typeof vi.fn>;
  };
  let compraService: {
    proveedores: ReturnType<typeof vi.fn>;
    crearProveedor: ReturnType<typeof vi.fn>;
    registrar: ReturnType<typeof vi.fn>;
  };
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const producto: Producto = {
    id: 5,
    nombre: 'Chamarra Impermeable',
    descripcion: null,
    categoria: null,
    departamento: null,
    precio_compra: '300.00',
    precio_venta: '599.00',
    imagen_url: null,
    no_resurtible: false,
    sin_descuento: false,
    activo: true,
    variantes: [
      {
        id: 10,
        producto_id: 5,
        talla: 'M',
        color: 'Negro',
        codigo_barras: null,
        activo: true,
        stock: [{ sucursal_id: 1, sucursal_nombre: 'Centro', stock_actual: 4, stock_minimo: 1 }],
      },
    ],
  };

  const kardexInicial = [
    {
      id: 1,
      tipo: 'entrada',
      cantidad: 4,
      motivo: 'compra',
      sucursal_nombre: 'Centro',
      usuario_nombre: 'Ana',
      stock_resultante: 4,
      fecha: '2026-07-20T10:00:00Z',
    },
  ];

  async function crearComponente(comprasCrear: boolean): Promise<void> {
    productoService = {
      obtener: vi
        .fn()
        .mockReturnValue(of({ producto, permisos: { crear: true, editar: true, eliminar: true, compras_crear: comprasCrear } })),
      categorias: vi.fn().mockReturnValue(of([])),
      departamentos: vi.fn().mockReturnValue(of([])),
      kardex: vi.fn().mockReturnValue(of(kardexInicial)),
    };
    compraService = {
      proveedores: vi.fn().mockReturnValue(of([{ id: 1, razon_social: 'Textiles del Norte' }])),
      crearProveedor: vi.fn(),
      registrar: vi.fn().mockReturnValue(of(undefined)),
    };
    toastService = { success: vi.fn(), error: vi.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ProductoDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        ConfirmationService,
        { provide: ProductoService, useValue: productoService },
        { provide: CompraService, useValue: compraService },
        { provide: ToastService, useValue: toastService },
        { provide: ConfiguracionService, useValue: { publica: vi.fn().mockReturnValue(of({ codigo_barras_automatico: false })) } },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductoDetalleComponent);
    fixture.detectChanges();
  }

  beforeEach(() => crearComponente(true));

  it('renderiza las 3 pestañas y el nombre del producto', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Chamarra Impermeable');
    expect(texto).toContain('General');
    expect(texto).toContain('Kardex');
    expect(texto).toContain('Auditoría');
  });

  it('renderiza la variante con su stock por sucursal en la pestaña General', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('M / Negro');
    expect(texto).toContain('Centro');
    expect(texto).toContain('4');
  });

  it('carga y muestra el kardex de la primera variante automaticamente', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('entrada');
    expect(texto).toContain('compra');
  });

  it('el tab de Auditoría no renderiza nucleo-audit-log-viewer hasta que el bloque @defer se activa', async () => {
    const bloques = await fixture.getDeferBlocks();
    expect(bloques).toHaveLength(1);

    expect(fixture.nativeElement.querySelector('nucleo-audit-log-viewer')).toBeNull();

    await bloques[0].render(DeferBlockState.Complete);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nucleo-audit-log-viewer')).not.toBeNull();
  });

  it('muestra el boton "Registrar compra" cuando el backend reporta permisos.compras_crear', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Registrar compra');
  });

  it('oculta el boton "Registrar compra" sin el permiso compras.crear', async () => {
    await crearComponente(false);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Registrar compra');
  });

  it('registrar una compra llama a CompraService con la variante correcta y refresca stock/kardex', () => {
    fixture.componentInstance.abrirModalCompra(producto.variantes![0]);
    fixture.detectChanges();

    fixture.componentInstance.onGuardarCompra({ proveedor_id: 1, cantidad: 15, precio_compra: 80 });

    expect(compraService.registrar).toHaveBeenCalledWith({
      proveedor_id: 1,
      numero_comprobante: undefined,
      items: [{ variante_id: 10, cantidad: 15, precio_compra: 80 }],
    });
    // Refresca ambos: el producto completo (stock) y el kardex de la
    // variante en la que se registro la compra.
    expect(productoService.obtener).toHaveBeenCalledTimes(2);
    expect(productoService.kardex).toHaveBeenCalledWith(10);
    expect(toastService.success).toHaveBeenCalledWith('Compra registrada.');
  });

  it('sin permiso de editar, muestra el mismo formulario deshabilitado (visualizar), no lo oculta', async () => {
    TestBed.resetTestingModule();
    const soloLecturaProductoService = {
      obtener: vi
        .fn()
        .mockReturnValue(of({ producto, permisos: { crear: false, editar: false, eliminar: false, compras_crear: false } })),
      categorias: vi.fn().mockReturnValue(of([])),
      departamentos: vi.fn().mockReturnValue(of([])),
      kardex: vi.fn().mockReturnValue(of(kardexInicial)),
    };
    await TestBed.configureTestingModule({
      imports: [ProductoDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        ConfirmationService,
        { provide: ProductoService, useValue: soloLecturaProductoService },
        { provide: CompraService, useValue: compraService },
        { provide: ToastService, useValue: toastService },
        { provide: ConfiguracionService, useValue: { publica: vi.fn().mockReturnValue(of({ codigo_barras_automatico: false })) } },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      ],
    }).compileComponents();

    const otroFixture = TestBed.createComponent(ProductoDetalleComponent);
    otroFixture.detectChanges();

    const texto = (otroFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No tienes permiso para editar productos');

    const formulario = otroFixture.debugElement.query(By.directive(DynamicFormComponent));
    expect(formulario).not.toBeNull();
    expect(formulario.componentInstance.form.disabled).toBe(true);
  });

  it('lee codigo_barras_automatico via ConfiguracionService.publica() al iniciar', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ProductoDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        ConfirmationService,
        { provide: ProductoService, useValue: productoService },
        { provide: CompraService, useValue: compraService },
        { provide: ToastService, useValue: toastService },
        { provide: ConfiguracionService, useValue: { publica: vi.fn().mockReturnValue(of({ codigo_barras_automatico: true })) } },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      ],
    }).compileComponents();

    const otroFixture = TestBed.createComponent(ProductoDetalleComponent);
    otroFixture.detectChanges();

    expect(otroFixture.componentInstance['codigoBarrasAutomatico']()).toBe(true);
  });

  it('un 422 de precio_compra/cantidad se remapea de items.0.* a los campos planos del formulario', () => {
    compraService.registrar.mockReturnValue(
      throwError(() => ({
        status: 422,
        error: { errors: { 'items.0.cantidad': ['La cantidad debe ser un entero.'] } },
      })),
    );

    fixture.componentInstance.abrirModalCompra(producto.variantes![0]);
    fixture.detectChanges();

    // No debe tronar al remapear e intentar setServerErrors sobre el
    // formulario montado en el modal.
    expect(() =>
      fixture.componentInstance.onGuardarCompra({ proveedor_id: 1, cantidad: -1, precio_compra: 80 }),
    ).not.toThrow();
  });
});
