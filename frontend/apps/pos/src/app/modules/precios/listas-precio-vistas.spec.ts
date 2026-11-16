import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { DynamicFormComponent } from '@nianva/ui-shared';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { ListaPrecioFormComponent } from './lista-precio-form/lista-precio-form.component';
import { ListaPrecioRegistroComponent } from './pages/lista-precio-registro/lista-precio-registro.component';
import { ListasPrecioListadoComponent } from './pages/listas-precio-listado/listas-precio-listado.component';
import { ListaPrecioListadoService } from './lista-precio-listado.service';
import {
  BUSCADOR_CLIENTE,
  BUSCADOR_PRODUCTO,
  BUSCADOR_VARIANTE_DE_PRODUCTO,
} from '../../core/buscadores-entidad.tokens';
import { SesionActualService } from '../../auth/sesion-actual.service';

describe('Listas de precio: vistas', () => {
  it('el alta valida nombre obligatorio y largo máximo antes de enviar', async () => {
    await TestBed.configureTestingModule({
      imports: [ListaPrecioFormComponent],
      providers: [...proveedoresDePantalla()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ListaPrecioFormComponent);
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
    const form = fixture.debugElement.query(
      By.directive(DynamicFormComponent),
    ).componentInstance;
    const guardar = vi.spyOn(fixture.componentInstance.guardar, 'emit');
    expect(form.form.get('nombre')?.invalid).toBe(true);
    form.onSubmit();
    expect(guardar).not.toHaveBeenCalled();
    form.form.get('nombre')?.setValue('x'.repeat(121));
    expect(form.form.get('nombre')?.invalid).toBe(true);
    form.form.get('nombre')?.setValue('Mayoreo');
    form.onSubmit();
    expect(guardar).toHaveBeenCalledWith({ nombre: 'Mayoreo' });
  });

  it('activar el indicador de envío conserva el nombre capturado', async () => {
    await TestBed.configureTestingModule({
      imports: [ListaPrecioFormComponent],
      providers: [...proveedoresDePantalla()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ListaPrecioFormComponent);
    fixture.componentRef.setInput('readonly', false);
    fixture.detectChanges();
    let form = fixture.debugElement.query(
      By.directive(DynamicFormComponent),
    ).componentInstance;
    form.form.get('nombre').setValue('Mayoreo');
    fixture.componentRef.setInput('enviando', true);
    fixture.detectChanges();
    form = fixture.debugElement.query(
      By.directive(DynamicFormComponent),
    ).componentInstance;
    expect(form.form.get('nombre').value).toBe('Mayoreo');
  });

  it('el formulario de consulta mantiene el nombre deshabilitado', async () => {
    await TestBed.configureTestingModule({
      imports: [ListaPrecioFormComponent],
      providers: [...proveedoresDePantalla()],
    }).compileComponents();
    const fixture = TestBed.createComponent(ListaPrecioFormComponent);
    fixture.componentRef.setInput('valorInicial', {
      id: 1,
      nombre: 'Mayoreo',
      activo: true,
    });
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    const form = fixture.debugElement.query(
      By.directive(DynamicFormComponent),
    ).componentInstance;
    expect(form.form.get('nombre')?.value).toBe('Mayoreo');
    expect(form.form.get('nombre')?.disabled).toBe(true);
  });

  it('sin permisos no ofrece crear, editar ni cambiar estado desde el listado', async () => {
    const fila = { id: 1, nombre: 'Mayoreo', activo: true };
    await TestBed.configureTestingModule({
      imports: [ListasPrecioListadoComponent],
      providers: [
        ...proveedoresDePantalla(),
        {
          provide: ListaPrecioListadoService,
          useValue: {
            listar: () =>
              of({
                data: [fila],
                meta: {
                  total: 1,
                  page: 1,
                  rows: 25,
                  filtros_aplicados: {},
                  permisos: { crear: false, editar: false, eliminar: false },
                },
              }),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ListasPrecioListadoComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ui-btn-crear')).toBeNull();
    const acciones = fixture.componentInstance['columnas'].find(
      (c) => c.tipo === 'acciones',
    );
    expect(acciones?.acciones(fila).map((a) => a.tipo)).toEqual(['ver']);
  });

  it('el registro ofrece General, Precios, Clientes y Auditoría y respeta solo lectura', async () => {
    const buscador = {
      buscar: () => of([]),
      obtener: () => of({ id: 1, nombre: 'Entidad' }),
      hijosDe: () => of([]),
    };
    await TestBed.configureTestingModule({
      imports: [ListaPrecioRegistroComponent],
      providers: [
        ...proveedoresDePantalla(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } },
        },
        {
          provide: ListaPrecioListadoService,
          useValue: {
            obtener: () =>
              of({
                data: {
                  id: 1,
                  nombre: 'Mayoreo',
                  activo: true,
                  items: [],
                  clientes: [],
                },
                meta: {
                  permisos: { crear: false, editar: false, eliminar: false },
                },
              }),
          },
        },
        {
          provide: SesionActualService,
          useValue: { sesion: () => ({ permisos: [] }) },
        },
        { provide: BUSCADOR_CLIENTE, useValue: buscador },
        { provide: BUSCADOR_PRODUCTO, useValue: buscador },
        { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useValue: buscador },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ListaPrecioRegistroComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[role="tab"]')).toHaveLength(
      4,
    );
    expect(fixture.nativeElement.textContent).toContain('Mayoreo');
    const form = fixture.debugElement.query(
      By.directive(DynamicFormComponent),
    ).componentInstance;
    expect(form.form.get('nombre')?.disabled).toBe(true);
  });
});
