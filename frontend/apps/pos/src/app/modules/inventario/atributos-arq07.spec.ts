import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Atributo, AtributoService } from '@nianva/domain-inventario';
import { ConfirmDialogService, ToastService } from '@nianva/ui-feedback';
import { SelectFiltroComponent } from '@nianva/ui-forms';
import { DynamicFormComponent } from '@nianva/ui-shared';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { SesionActualService } from '../../auth/sesion-actual.service';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { atributosDeVarianteResolver } from './atributos-de-variante.resolver';
import { AtributoRegistroComponent } from './pages/atributo-registro/atributo-registro.component';
import { VarianteFormComponent } from './variante-form/variante-form.component';

/** ARQ-07a: atributos genéricos de variante en el frontend. */
const talla: Atributo = {
  id: 1,
  nombre: 'Talla',
  orden: 0,
  valores: [
    { id: 11, nombre: 'CH', orden: 0 },
    { id: 12, nombre: 'M', orden: 1 },
  ],
};
const sabor: Atributo = {
  id: 2,
  nombre: 'Sabor',
  orden: 1,
  valores: [{ id: 21, nombre: 'Fresa', orden: 0 }],
};

const permisosTodos = { crear: true, editar: true, eliminar: true };

async function crearRegistro(opciones: {
  id: string | null;
  servicio: Partial<Record<keyof AtributoService, unknown>>;
  permisosSesion?: string[];
  confirmar?: boolean;
}) {
  const toast = { success: vi.fn(), error: vi.fn() };
  await TestBed.configureTestingModule({
    imports: [AtributoRegistroComponent],
    providers: [
      ...proveedoresDePantalla(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => opciones.id } } } },
      { provide: AtributoService, useValue: opciones.servicio },
      { provide: SesionActualService, useValue: { sesion: () => ({ permisos: opciones.permisosSesion ?? [] }) } },
      { provide: ToastService, useValue: toast },
      {
        provide: ConfirmDialogService,
        useValue: { confirmarEliminacion: () => Promise.resolve(opciones.confirmar ?? true) },
      },
    ],
  }).compileComponents();
  const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(AtributoRegistroComponent);
  fixture.detectChanges();

  return { fixture, toast, navegar, el: fixture.nativeElement as HTMLElement };
}

describe('Atributos de variante: registro', () => {
  it('el alta crea el atributo con nombre y orden y abre su registro', async () => {
    const crear = vi.fn(() => of({ id: 7, nombre: 'Color', orden: 2 }));
    const { fixture, navegar, toast } = await crearRegistro({
      id: null,
      servicio: { crear },
      permisosSesion: ['inventario.crear'],
    });

    const form = fixture.debugElement.query(By.directive(DynamicFormComponent)).componentInstance;
    form.form.get('nombre').setValue('Color');
    form.form.get('orden').setValue(2);
    form.onSubmit();

    expect(crear).toHaveBeenCalledWith({ nombre: 'Color', orden: 2 });
    expect(toast.success).toHaveBeenCalledWith('Atributo creado.');
    expect(navegar).toHaveBeenCalledWith(['/inventario/atributos', 7]);
  });

  it('sin inventario.crear el alta queda en solo lectura', async () => {
    const { fixture } = await crearRegistro({ id: null, servicio: {} });

    const form = fixture.debugElement.query(By.directive(DynamicFormComponent)).componentInstance;
    expect(form.form.get('nombre').disabled).toBe(true);
  });

  it('el detalle ofrece General, Valores y Auditoría y lista los valores', async () => {
    const { el } = await crearRegistro({
      id: '1',
      servicio: { obtener: () => of({ data: talla, meta: { permisos: permisosTodos } }) },
    });

    expect(el.querySelectorAll('[role="tab"]')).toHaveLength(3);
    expect(el.textContent).toContain('Valores');
    expect(el.textContent).toContain('CH');
    expect(el.textContent).toContain('Eliminar atributo');
  });

  it('agregar un valor repinta el atributo con la respuesta y limpia el formulario', async () => {
    const conNuevo: Atributo = { ...talla, valores: [...(talla.valores ?? []), { id: 13, nombre: 'G', orden: 2 }] };
    const crearValor = vi.fn(() => of(conNuevo));
    const { fixture, el } = await crearRegistro({
      id: '1',
      servicio: { obtener: () => of({ data: talla, meta: { permisos: permisosTodos } }), crearValor },
    });
    const componente = fixture.componentInstance as unknown as {
      valorNombre: { setValue(v: string): void; value: string };
      valorOrden: { setValue(v: number | null): void };
      guardarValor(): void;
    };

    componente.valorNombre.setValue('G');
    componente.valorOrden.setValue(2);
    componente.guardarValor();
    fixture.detectChanges();

    expect(crearValor).toHaveBeenCalledWith(1, { nombre: 'G', orden: 2 });
    expect(componente.valorNombre.value).toBe('');
    expect(el.textContent).toContain('G');
  });

  it('sin permiso de editar no ofrece el formulario de valores ni acciones por valor', async () => {
    const { fixture, el } = await crearRegistro({
      id: '1',
      servicio: {
        obtener: () => of({ data: talla, meta: { permisos: { crear: false, editar: false, eliminar: false } } }),
      },
    });

    expect(el.textContent).not.toContain('Agregar valor');
    expect(el.textContent).not.toContain('Eliminar atributo');
    const acciones = (fixture.componentInstance as unknown as { columnasValores: { tipo: string; acciones?: () => unknown[] }[] })
      .columnasValores.find((c) => c.tipo === 'acciones');
    expect(acciones?.acciones?.()).toEqual([]);
  });

  it('si el atributo está en uso, eliminarlo muestra el mensaje del backend', async () => {
    const enUso = new HttpErrorResponse({
      status: 422,
      error: { message: 'El atributo «Talla» ya lo usa al menos una variante.', error_code: 'atributo_en_uso' },
    });
    const eliminar = vi.fn(() => throwError(() => enUso));
    const { fixture, toast, navegar } = await crearRegistro({
      id: '1',
      servicio: { obtener: () => of({ data: talla, meta: { permisos: permisosTodos } }), eliminar },
    });

    await (fixture.componentInstance as unknown as { eliminar(): Promise<void> }).eliminar();

    expect(eliminar).toHaveBeenCalledWith(1);
    expect(toast.error).toHaveBeenCalledWith('El atributo «Talla» ya lo usa al menos una variante.');
    expect(navegar).not.toHaveBeenCalled();
  });
});

describe('Atributos de variante: formulario de variante', () => {
  async function crearFormulario(entradas: Record<string, unknown>) {
    await TestBed.configureTestingModule({
      imports: [VarianteFormComponent],
      providers: [...proveedoresDePantalla()],
    }).compileComponents();
    const fixture = TestBed.createComponent(VarianteFormComponent);
    for (const [nombre, valor] of Object.entries(entradas)) fixture.componentRef.setInput(nombre, valor);
    fixture.detectChanges();
    const guardar = vi.spyOn(fixture.componentInstance.guardar, 'emit');
    const enviar = () => fixture.debugElement.query(By.directive(DynamicFormComponent)).componentInstance.onSubmit();

    return { fixture, guardar, enviar };
  }

  it('muestra un selector por atributo, con "Sin valor" y sus valores', async () => {
    const { fixture } = await crearFormulario({ atributos: [talla, sabor] });

    const selectores = fixture.debugElement.queryAll(By.directive(SelectFiltroComponent));
    expect(selectores).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Talla');
    expect(fixture.nativeElement.textContent).toContain('Sabor');
    expect(selectores[0].componentInstance.opciones()).toEqual([
      { label: 'Sin valor', value: null },
      { label: 'CH', value: 11 },
      { label: 'M', value: 12 },
    ]);
  });

  it('precarga los valores de la variante y envía los ids elegidos', async () => {
    const { fixture, guardar, enviar } = await crearFormulario({
      atributos: [talla, sabor],
      valorInicial: {
        id: 5,
        producto_id: 1,
        talla: null,
        color: null,
        codigo_barras: null,
        activo: true,
        atributos: [{ atributo_id: 1, atributo: 'Talla', valor_id: 12, valor_nombre: 'M' }],
      },
    });
    const componente = fixture.componentInstance as unknown as {
      valoresElegidos: { get(clave: string): { value: number | null; setValue(v: number | null): void } | null };
    };

    expect(componente.valoresElegidos.get('1')?.value).toBe(12);
    expect(componente.valoresElegidos.get('2')?.value).toBeNull();
    componente.valoresElegidos.get('2')?.setValue(21);
    enviar();

    expect(guardar).toHaveBeenCalledWith(expect.objectContaining({ valores: [12, 21] }));
  });

  it('elegir "Sin valor" en todos manda la lista vacía para quitar los valores', async () => {
    const { guardar, enviar } = await crearFormulario({ atributos: [talla] });

    enviar();

    expect(guardar).toHaveBeenCalledWith(expect.objectContaining({ valores: [] }));
  });

  it('sin atributos en el catálogo no manda valores (el backend conserva los de la variante)', async () => {
    const { guardar, enviar } = await crearFormulario({});

    enviar();

    expect(guardar).toHaveBeenCalledTimes(1);
    expect(guardar.mock.calls[0][0]).not.toHaveProperty('valores');
  });
});

describe('Atributos de variante: resolver del detalle de producto', () => {
  function resolver(conValores: () => Observable<Atributo[]>) {
    TestBed.configureTestingModule({ providers: [{ provide: AtributoService, useValue: { conValores } }] });

    return TestBed.runInInjectionContext(() =>
      atributosDeVarianteResolver({} as never, {} as never),
    ) as Observable<Atributo[]>;
  }

  it('entrega los atributos con sus valores', async () => {
    await expect(firstValueFrom(resolver(() => of([talla])))).resolves.toEqual([talla]);
  });

  it('si la carga falla, entrega una lista vacía y la vista abre igual', async () => {
    await expect(firstValueFrom(resolver(() => throwError(() => new Error('500'))))).resolves.toEqual([]);
  });
});
