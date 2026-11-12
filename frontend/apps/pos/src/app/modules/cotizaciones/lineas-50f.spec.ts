import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { CotizacionFormComponent } from './pages/cotizacion-form/cotizacion-form.component';
import { CotizacionService } from './cotizacion.service';
import { AuthStateService } from '../../auth/auth-state.service';
import { BUSCADOR_CLIENTE } from '../../core/buscadores-entidad.tokens';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormGroup } from '@angular/forms';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { aplicarErroresServidor } from '@nianva/ui-forms';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { LineasCotizacionComponent } from './lineas-cotizacion/lineas-cotizacion.component';
import { DevolucionFormComponent } from '../devoluciones/pages/devolucion-form/devolucion-form.component';
import { VentaService } from '../tpv/venta.service';
import { DevolucionService } from '../devoluciones/devolucion.service';
import { MetodoPagoService } from '../tpv/metodo-pago.service';
import { BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../core/buscadores-entidad.tokens';

vi.stubGlobal('ResizeObserver', class { observe = vi.fn(); unobserve = vi.fn(); disconnect = vi.fn(); });
const detalles = [
  { id: 1, variante_id: 5, variante: { id: 5, nombre: 'Martillo', producto_nombre: 'Martillo' }, cantidad: 2, precio_unitario: '20.00', descuento: '3.00', subtotal: '37.00' },
  { id: 2, variante_id: 6, variante: { id: 6, nombre: 'Clavo', producto_nombre: 'Clavo' }, cantidad: 3, precio_unitario: '25.00', descuento: '2.00', subtotal: '73.00' },
];
async function montarCotizacion(manual = true): Promise<ComponentFixture<LineasCotizacionComponent>> {
  await TestBed.configureTestingModule({ imports: [LineasCotizacionComponent], providers: [
    ...proveedoresDePantalla(),
    { provide: VentaService, useValue: { cotizar: vi.fn() } },
    { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
    { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
  ] }).compileComponents();
  const fixture = TestBed.createComponent(LineasCotizacionComponent);
  fixture.componentRef.setInput('valorInicial', detalles);
  fixture.componentRef.setInput('precioManual', manual);
  fixture.detectChanges(); return fixture;
}
async function montarDevolucion(): Promise<ComponentFixture<DevolucionFormComponent>> {
  await TestBed.configureTestingModule({ imports: [DevolucionFormComponent], providers: [
    ...proveedoresDePantalla(),
    { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ venta_id: '55' }) } } },
    { provide: VentaService, useValue: { obtener: vi.fn().mockReturnValue(of({ id: 55, total: '110.00', detalles, es_venta_sombra: false })), cotizar: vi.fn() } },
    { provide: DevolucionService, useValue: { registrar: vi.fn() } },
    { provide: MetodoPagoService, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
    { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
    { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
  ] }).compileComponents();
  const fixture = TestBed.createComponent(DevolucionFormComponent); fixture.detectChanges(); return fixture;
}
for (const area of ['cotizacion', 'devolucion'] as const) {
  describe('50f líneas ' + area, () => {
    const montar = () => area === 'cotizacion' ? montarCotizacion() : montarDevolucion();
    const clave = area === 'cotizacion' ? 'items' : 'items_devueltos';
    it('usa un FormArray y valida cada línea de forma independiente', async () => {
      const fixture = await montar();
      const form: FormGroup = Reflect.get(fixture.componentInstance, 'formularioLineas');
      expect(form).toBeInstanceOf(FormGroup);
      const filas = form.get(clave) as FormArray;
      expect(filas).toBeInstanceOf(FormArray); expect(filas.length).toBe(2);
      filas.at(0).get('cantidad')?.setValue(-1);
      expect(filas.at(0).invalid).toBe(true); expect(filas.at(1).valid).toBe(true);
      if (area === 'cotizacion') {
        filas.at(0).get('precio_unitario')?.setValue(-1); filas.at(0).get('descuento')?.setValue(-1);
        expect(filas.at(0).get('precio_unitario')?.hasError('min')).toBe(true);
        expect(filas.at(0).get('descuento')?.hasError('min')).toBe(true);
      } else {
        filas.at(0).get('cantidad')?.setValue(3);
        expect(filas.at(0).get('cantidad')?.hasError('max')).toBe(true);
      }
    });
    it('editar el FormArray recalcula los totales de la línea correcta', async () => {
      const fixture = await montar(); const instancia = fixture.componentInstance;
      const form: FormGroup = Reflect.get(instancia, 'formularioLineas');
      expect(form).toBeInstanceOf(FormGroup);
      form.get(clave + '.1.cantidad')?.setValue(2);
      if (area === 'cotizacion') expect(Reflect.get(instancia, 'subtotal')()).toBe(85);
      else {
        form.get(clave + '.0.cantidad')?.setValue(1);
        expect(Reflect.get(instancia, 'montoDevolucionEstimado')()).toBe(70);
        form.get(clave + '.1.va_a_merma')?.setValue(true);
        expect(Reflect.get(instancia, 'unidadesMerma')()).toBe(2);
        expect(Reflect.get(instancia, 'unidadesRegresanAStock')()).toBe(1);
      }
    });
    it('asigna el error anidado del backend solo al control de su línea', async () => {
      const fixture = await montar(); const form: FormGroup = Reflect.get(fixture.componentInstance, 'formularioLineas');
      expect(form).toBeInstanceOf(FormGroup);
      expect(aplicarErroresServidor(form, { error: { errors: { [clave + '.1.cantidad']: ['Cantidad rechazada'] } } })).toBe(true);
      expect(form.get(clave + '.1.cantidad')?.getError('servidor')).toBe('Cantidad rechazada');
      expect(form.get(clave + '.1.cantidad')?.touched).toBe(true);
      expect(form.get(clave + '.0.cantidad')?.hasError('servidor')).toBe(false);
    });
    it('cada control visible identifica producto y número de línea', async () => {
      const fixture = await montar(); const elemento: HTMLElement = fixture.nativeElement;
      const etiquetas = [...elemento.querySelectorAll('ui-campo label')].map(e => e.textContent ?? '');
      expect(etiquetas.some(e => /Cantidad, línea 1: Martillo/.test(e))).toBe(true);
      expect(etiquetas.some(e => /Cantidad, línea 2: Clavo/.test(e))).toBe(true);
    });
  });
}
it('sin precio_manual el FormArray impide modificar precio y descuento', async () => {
  const fixture = await montarCotizacion(false); const instancia = fixture.componentInstance;
  const form: FormGroup = Reflect.get(instancia, 'formularioLineas'); expect(form).toBeInstanceOf(FormGroup);
  expect(form.get('items.0.precio_unitario')?.disabled).toBe(true);
  expect(form.get('items.0.descuento')?.disabled).toBe(true);
  form.get('items.0.precio_unitario')?.setValue(100);
  form.get('items.0.descuento')?.setValue(10);
  expect(Reflect.get(instancia, 'subtotal')()).toBe(110);
});
it('quitar una línea conserva la edición de la siguiente en su índice nuevo', async () => {
  const fixture = await montarCotizacion(); const instancia = fixture.componentInstance;
  const form: FormGroup = Reflect.get(instancia, 'formularioLineas'); expect(form).toBeInstanceOf(FormGroup);
  instancia.quitarLinea(0); form.get('items.0.cantidad')?.setValue(2);
  expect(Reflect.get(instancia, 'lineas')()).toHaveLength(1);
  expect(Reflect.get(instancia, 'subtotal')()).toBe(48);
});

it('errores de items_devueltos filtrados se asignan a la fila original seleccionada', async () => {
  const fixture = await montarDevolucion(); const instancia = fixture.componentInstance;
  const form: FormGroup = Reflect.get(instancia, 'formularioLineas'); expect(form).toBeInstanceOf(FormGroup);
  vi.spyOn(TestBed.inject(DevolucionService), 'registrar').mockReturnValue(throwError(() => ({ error: { errors: { 'items_devueltos.0.cantidad': ['Saldo insuficiente'] } } })));
  form.get('items_devueltos.1.cantidad')?.setValue(1);
  instancia.onPagosCambio({ pagos: [{ metodo_pago_id: 1, monto: 25 }], cuadra: true, suma: 25 });
  instancia.registrarDevolucion();
  expect(form.get('items_devueltos.1.cantidad')?.getError('servidor')).toBe('Saldo insuficiente');
  expect(form.get('items_devueltos.0.cantidad')?.hasError('servidor')).toBe(false);
});
it('sin precio_manual el payload conserva precio y descuento de los controles deshabilitados', async () => {
  const fixture = await montarCotizacion(false); const instancia = fixture.componentInstance;
  const form: FormGroup = Reflect.get(instancia, 'formularioLineas'); expect(form).toBeInstanceOf(FormGroup);
  const emitido = vi.fn(); instancia.cambio.subscribe(emitido);
  instancia.actualizarCantidad(0, 3);
  expect(form.value.items?.[0]).not.toHaveProperty('precio_unitario');
  expect(form.value.items?.[0]).not.toHaveProperty('descuento');
  expect(form.getRawValue().items[0]).toMatchObject({ precio_unitario: 20, descuento: 3 });
  expect(emitido).toHaveBeenLastCalledWith({ items: [
    { variante_id: 5, cantidad: 3, precio_unitario: 20, descuento: 3 },
    { variante_id: 6, cantidad: 3, precio_unitario: 25, descuento: 2 },
  ], subtotal: 130 });
});

it('guardar sin precio_manual envía los importes de las líneas aunque estén deshabilitados', async () => {
  const crear = vi.fn().mockReturnValue(of({ id: 99 }));
  await TestBed.configureTestingModule({ imports: [CotizacionFormComponent], providers: [
    ...proveedoresDePantalla(),
    { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
    { provide: AuthStateService, useValue: { usuario: () => ({ sucursal_id: 7 }) } },
    { provide: CotizacionService, useValue: { permisos: () => of({ precio_manual: false }), crear } },
    { provide: VentaService, useValue: { cotizar: vi.fn() } },
    { provide: BUSCADOR_CLIENTE, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
    { provide: BUSCADOR_PRODUCTO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
    { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: { hijosDe: vi.fn().mockReturnValue(of([])) } },
  ] }).compileComponents();
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(CotizacionFormComponent); fixture.detectChanges();
  const editor = fixture.debugElement.query(By.directive(LineasCotizacionComponent)).componentInstance as LineasCotizacionComponent;
  editor.valorInicial = detalles; editor.ngOnChanges(); fixture.detectChanges();
  expect(editor.formularioLineas.controls.items.at(0).controls.precio_unitario.disabled).toBe(true);
  fixture.componentInstance.guardar();
  expect(crear).toHaveBeenCalledWith(expect.objectContaining({ sucursal_id: 7, items: [
    { variante_id: 5, cantidad: 2, precio_unitario: 20, descuento: 3 },
    { variante_id: 6, cantidad: 3, precio_unitario: 25, descuento: 2 },
  ] }));
});
