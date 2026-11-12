import { Type } from '@angular/core';
import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { FormGroup } from '@angular/forms';
import {
  AuditLogSource,
  ConfirmDialogService,
  DynamicFormComponent,
  ToastService,
} from '@nianva/ui-shared';
import { of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { ProductoService } from './producto.service';
import { CompraService } from './compra.service';
import { ProductoFormComponent } from './producto-form/producto-form.component';
import { VarianteFormComponent } from './variante-form/variante-form.component';
import { CompraFormComponent } from './compra-form/compra-form.component';
import { ProveedorFormComponent } from './proveedor-form/proveedor-form.component';
import { ProductosListComponent } from './pages/productos-list/productos-list.component';
import { ProductoDetalleComponent } from './pages/producto-detalle/producto-detalle.component';
import { KardexListComponent } from './kardex-list/kardex-list.component';
import { VariantesListComponent } from './variantes-list/variantes-list.component';

const producto = {
  id: 7,
  nombre: 'Producto de prueba',
  descripcion: '',
  categoria: null,
  departamento: null,
  precio_compra: '5.00',
  precio_venta: '10.00',
  imagen_url: null,
  no_resurtible: false,
  sin_descuento: false,
  activo: true,
  variantes: [],
};
async function crear(
  componente: Type<object>,
  inputs: Record<string, unknown> = {},
  esperarCatalogos = false,
) {
  const catalogos = {
    categorias: new Subject<never[]>(),
    departamentos: new Subject<never[]>(),
  };
  const servicio = {
    listar: vi.fn().mockReturnValue(
      of({
        data: [producto],
        total: 80,
        permisos: { crear: true, editar: true, eliminar: true },
      }),
    ),
    obtener: vi.fn().mockReturnValue(
      of({
        producto,
        permisos: { editar: true, eliminar: true, compras_crear: true },
      }),
    ),
    categorias: vi
      .fn()
      .mockReturnValue(esperarCatalogos ? catalogos.categorias : of([])),
    departamentos: vi
      .fn()
      .mockReturnValue(esperarCatalogos ? catalogos.departamentos : of([])),
    kardex: vi.fn().mockReturnValue(of([])),
  };
  await TestBed.configureTestingModule({
    imports: [componente],
    deferBlockBehavior: DeferBlockBehavior.Manual,
    providers: [
      ...proveedoresDePantalla(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } },
      },
      { provide: ProductoService, useValue: servicio },
      { provide: CompraService, useValue: { proveedores: () => of([]) } },
      {
        provide: ConfiguracionService,
        useValue: { publica: () => of({ codigo_barras_automatico: false }) },
      },
      { provide: AuditLogSource, useValue: { listar: () => of([]) } },
      { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(componente);
  for (const [nombre, valor] of Object.entries(inputs))
    fixture.componentRef.setInput(nombre, valor);
  fixture.detectChanges();
  return {
    fixture,
    servicio,
    catalogos,
    host: fixture.nativeElement as HTMLElement,
  };
}
function ejecutar(
  componente: object,
  metodo: string,
  ...args: unknown[]
): void {
  Reflect.get(componente, metodo).apply(componente, args);
}

describe('50m productos', () => {
  it('compone el listado con un encabezado, filtro y tabla compartidos', async () => {
    const { host } = await crear(ProductosListComponent);
    expect(host.querySelectorAll('h1')).toHaveLength(1);
    for (const selector of ['ui-page-header h1', 'ui-filter-bar', 'ui-tabla'])
      expect(host.querySelector(selector)).not.toBeNull();
  });
  it('meta avanza a la segunda página aunque el total no cambie', async () => {
    const { fixture, servicio } = await crear(ProductosListComponent);
    ejecutar(fixture.componentInstance, 'onCambio', {
      page: 2,
      rows: 25,
      sortField: null,
      sortOrder: null,
    });
    fixture.detectChanges();
    expect(Reflect.get(fixture.componentInstance, 'meta')().page).toBe(2);
    expect(servicio.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ first: 25 }),
      '',
    );
  });
  it('permite reintentar el listado tras un error', async () => {
    const { fixture, servicio, host } = await crear(ProductosListComponent);
    servicio.listar.mockReturnValueOnce(
      throwError(() => new Error('sin conexión')),
    );
    ejecutar(fixture.componentInstance, 'reintentar');
    fixture.detectChanges();
    expect(host.textContent).toContain('No se pudo cargar');
    ejecutar(fixture.componentInstance, 'reintentar');
    fixture.detectChanges();
    expect(host.textContent).not.toContain('No se pudo cargar');
  });
  it('Limpiar devuelve los filtros y la página a su estado inicial', async () => {
    const { fixture, servicio } = await crear(ProductosListComponent);
    ejecutar(fixture.componentInstance, 'onBuscarInput', 'pendiente');
    ejecutar(fixture.componentInstance, 'limpiarFiltros');
    fixture.detectChanges();
    expect(Reflect.get(fixture.componentInstance, 'busqueda')()).toBe('');
    expect(servicio.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ first: 0 }),
      '',
    );
  });
  it('conserva el nombre del registro bajo un único h1 compartido', async () => {
    const { host } = await crear(ProductoDetalleComponent);
    expect(host.querySelectorAll('h1')).toHaveLength(1);
    expect(host.querySelector('ui-page-header h1')).not.toBeNull();
    expect(host.querySelector('h2')?.textContent).toContain(producto.nombre);
  });
  it('permite reintentar una carga fallida del producto', async () => {
    const { fixture, servicio, host } = await crear(ProductoDetalleComponent);
    servicio.obtener.mockReturnValueOnce(
      throwError(() => new Error('sin conexión')),
    );
    ejecutar(fixture.componentInstance, 'reintentar');
    fixture.detectChanges();
    expect(host.textContent).toContain('No se pudo cargar');
    ejecutar(fixture.componentInstance, 'reintentar');
    fixture.detectChanges();
    expect(host.textContent).not.toContain('No se pudo cargar');
  });
  it('presenta el kardex en una tabla compartida', async () => {
    const { host } = await crear(KardexListComponent);
    expect(host.querySelector('ui-tabla')).not.toBeNull();
  });
  it('permite recuperar el kardex tras una carga fallida', async () => {
    const { fixture, servicio } = await crear(ProductoDetalleComponent);
    servicio.kardex.mockReturnValueOnce(
      throwError(() => new Error('sin conexión')),
    );
    ejecutar(fixture.componentInstance, 'seleccionarVariante', 8);
    fixture.detectChanges();
    expect(Reflect.get(fixture.componentInstance, 'errorKardex')()).toBe(true);
    ejecutar(fixture.componentInstance, 'seleccionarVariante', 8);
    fixture.detectChanges();
    expect(Reflect.get(fixture.componentInstance, 'errorKardex')()).toBe(false);
  });
  it('mantiene una tabla compartida de stock por sucursal en cada variante', async () => {
    const { host } = await crear(VariantesListComponent, {
      variantes: [
        {
          id: 8,
          talla: 'M',
          color: 'Azul',
          activo: true,
          stock: [
            {
              sucursal_id: 1,
              sucursal_nombre: 'Centro',
              stock_actual: 2,
              stock_minimo: 3,
            },
          ],
        },
      ],
    });
    expect(host.querySelector('ui-tabla')).not.toBeNull();
    expect(host.textContent).toContain('Centro');
  });
});
for (const formulario of [
  { componente: ProductoFormComponent, campo: 'nombre', inputs: {} },
  {
    componente: VarianteFormComponent,
    campo: 'talla',
    inputs: { valorInicial: null },
  },
  {
    componente: CompraFormComponent,
    campo: 'numero_comprobante',
    inputs: { proveedores: [{ id: 1, razon_social: 'Proveedor' }] },
  },
  { componente: ProveedorFormComponent, campo: 'razon_social', inputs: {} },
]) {
  it(
    formulario.componente.name +
      ' conserva valores y errores al cambiar enviando',
    async () => {
      const { fixture, host } = await crear(
        formulario.componente,
        formulario.inputs,
      );
      const dinamico = fixture.debugElement.query(
        By.directive(DynamicFormComponent),
      ).componentInstance as DynamicFormComponent;
      const control = dinamico.form.get(formulario.campo);
      control?.setValue('Conservado');
      fixture.componentRef.setInput('enviando', true);
      fixture.detectChanges();
      expect(
        host.querySelector<HTMLButtonElement>('button[type="submit"]')
          ?.disabled,
      ).toBe(true);
      expect(dinamico.form.get(formulario.campo)?.value).toBe('Conservado');
      ejecutar(fixture.componentInstance, 'setServerErrors', {
        [formulario.campo]: ['Error de servidor'],
      });
      fixture.componentRef.setInput('enviando', false);
      fixture.detectChanges();
      expect(dinamico.form.get(formulario.campo)?.hasError('server')).toBe(
        true,
      );
      expect(host.textContent).toContain('Error de servidor');
    },
  );
}
it('los precios del producto usan dinero, mantienen el payload y respetan solo lectura', async () => {
  const { fixture, host } = await crear(ProductoFormComponent);
  expect(host.querySelectorAll('ui-input-dinero')).toHaveLength(2);
  const grupo = Reflect.get(
    fixture.componentInstance,
    'numericos',
  ) as FormGroup;
  grupo.setValue({ precio_compra: 5, precio_venta: 10 });
  const emitido = vi.fn();
  Reflect.get(fixture.componentInstance, 'guardar').subscribe(emitido);
  ejecutar(fixture.componentInstance, 'onSubmit', { nombre: 'Producto' });
  expect(emitido).toHaveBeenCalledWith(
    expect.objectContaining({
      nombre: 'Producto',
      precio_compra: 5,
      precio_venta: 10,
    }),
  );
  fixture.componentRef.setInput('readonly', true);
  fixture.detectChanges();
  expect(grupo.disabled).toBe(true);
  expect(
    Array.from(
      host.querySelectorAll<HTMLInputElement>('ui-input-dinero input'),
    ).every((i) => i.disabled),
  ).toBe(true);
});
it('la compra valida cantidad y precio proyectados y conserva los errores del servidor', async () => {
  const { fixture, host } = await crear(CompraFormComponent, {
    proveedores: [{ id: 1, razon_social: 'Proveedor' }],
  });
  expect(host.querySelector('ui-input-dinero')).not.toBeNull();
  expect(host.querySelector('ui-input-cantidad')).not.toBeNull();
  const grupo = Reflect.get(
    fixture.componentInstance,
    'numericos',
  ) as FormGroup;
  const dinamico = fixture.debugElement.query(
    By.directive(DynamicFormComponent),
  ).componentInstance as DynamicFormComponent;
  dinamico.form.setValue({ proveedor_id: 1, numero_comprobante: '' });
  const emitido = vi.fn();
  Reflect.get(fixture.componentInstance, 'guardar').subscribe(emitido);
  grupo.setValue({ cantidad: 0, precio_compra: -1 });
  expect(grupo.invalid).toBe(true);
  dinamico.onSubmit();
  expect(emitido).not.toHaveBeenCalled();
  grupo.setValue({ cantidad: 3, precio_compra: 5 });
  expect(grupo.valid).toBe(true);
  dinamico.onSubmit();
  expect(emitido).toHaveBeenCalledWith(
    expect.objectContaining({ proveedor_id: 1, cantidad: 3, precio_compra: 5 }),
  );
  ejecutar(fixture.componentInstance, 'setServerErrors', {
    cantidad: ['Cantidad rechazada'],
  });
  fixture.detectChanges();
  expect(grupo.get('cantidad')?.hasError('servidor')).toBe(true);
  expect(host.textContent).toContain('Cantidad rechazada');
});
it('agrupa todas las sucursales de stock bajo en un solo aviso por variante', async () => {
  const { host } = await crear(VariantesListComponent, {
    variantes: [
      {
        id: 8,
        talla: 'M',
        activo: true,
        stock: [
          {
            sucursal_id: 1,
            sucursal_nombre: 'Centro',
            stock_actual: 3,
            stock_minimo: 5,
          },
          {
            sucursal_id: 2,
            sucursal_nombre: 'Norte',
            stock_actual: 0,
            stock_minimo: 2,
          },
        ],
      },
    ],
  });
  const alertas = host.querySelectorAll('ui-alert.ui-alert--peligro');
  expect(alertas).toHaveLength(1);
  expect(alertas[0].textContent).toContain('Centro (3 de 5)');
  expect(alertas[0].textContent).toContain('Norte (0 de 2)');
});

it('editar los precios conserva el nombre escrito en el formulario del producto', async () => {
  const { fixture, host } = await crear(ProductoFormComponent, {
    enviando: false,
  });
  const nombre = host.querySelector<HTMLInputElement>('input#nombre');
  expect(nombre).not.toBeNull();
  if (!nombre) return;
  nombre.value = 'Nombre conservado';
  nombre.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
  const precios = host.querySelectorAll<HTMLInputElement>(
    'ui-input-dinero input',
  );
  expect(precios).toHaveLength(2);
  precios[0].value = '5';
  precios[0].dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
  expect(nombre.value).toBe('Nombre conservado');
  const dinamico = fixture.debugElement.query(
    By.directive(DynamicFormComponent),
  ).componentInstance as DynamicFormComponent;
  expect(dinamico.form.get('nombre')?.value).toBe('Nombre conservado');
});

it('espera ambos catálogos antes de editar y conserva el nombre al introducir precios', async () => {
  const { fixture, host, catalogos } = await crear(
    ProductoFormComponent,
    { enviando: false },
    true,
  );
  expect(host.querySelector('nucleo-dynamic-form')).toBeNull();
  expect(host.querySelector('ui-skeleton')).not.toBeNull();
  catalogos.categorias.next([]);
  catalogos.categorias.complete();
  fixture.detectChanges();
  expect(host.querySelector('nucleo-dynamic-form')).toBeNull();
  catalogos.departamentos.next([]);
  catalogos.departamentos.complete();
  fixture.detectChanges();
  const nombre = host.querySelector<HTMLInputElement>('input#nombre');
  expect(nombre).not.toBeNull();
  if (!nombre) return;
  nombre.value = 'Nombre conservado';
  nombre.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
  const precio = host.querySelector<HTMLInputElement>('ui-input-dinero input');
  if (!precio) throw new Error('No se renderizó el precio');
  precio.value = '5';
  precio.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
  expect(nombre.value).toBe('Nombre conservado');
});
it('permite reintentar la carga de catálogos del formulario', async () => {
  const { fixture, host, catalogos, servicio } = await crear(
    ProductoFormComponent,
    { enviando: false },
    true,
  );
  catalogos.categorias.error(new Error('sin conexión'));
  fixture.detectChanges();
  expect(host.textContent).toContain('No se pudo cargar');
  servicio.categorias.mockReturnValue(of([]));
  servicio.departamentos.mockReturnValue(of([]));
  ejecutar(fixture.componentInstance, 'cargarCatalogos');
  fixture.detectChanges();
  expect(host.querySelector('nucleo-dynamic-form')).not.toBeNull();
  expect(host.textContent).not.toContain('No se pudo cargar');
});
