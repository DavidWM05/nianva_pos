import { Type } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import {
  AuditLogSource,
  ConfirmDialogService,
  DynamicFormComponent,
  ToastService,
} from '@nianva/ui-shared';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { CategoriaService } from './categoria.service';
import { DepartamentoService } from './departamento.service';
import { CategoriasListComponent } from './pages/categorias-list/categorias-list.component';
import { DepartamentosListComponent } from './pages/departamentos-list/departamentos-list.component';
import { CategoriaCrearComponent } from './pages/categoria-crear/categoria-crear.component';
import { DepartamentoCrearComponent } from './pages/departamento-crear/departamento-crear.component';
import { CategoriaDetalleComponent } from './pages/categoria-detalle/categoria-detalle.component';
import { DepartamentoDetalleComponent } from './pages/departamento-detalle/departamento-detalle.component';

function ejecutar(
  componente: object,
  metodo: string,
  ...argumentos: unknown[]
): void {
  Reflect.get(componente, metodo).apply(componente, argumentos);
}

for (const pantalla of [
  {
    nombre: 'categoría',
    registro: 'categoria',
    servicio: CategoriaService,
    listado: CategoriasListComponent,
    crear: CategoriaCrearComponent,
    detalle: CategoriaDetalleComponent,
  },
  {
    nombre: 'departamento',
    registro: 'departamento',
    servicio: DepartamentoService,
    listado: DepartamentosListComponent,
    crear: DepartamentoCrearComponent,
    detalle: DepartamentoDetalleComponent,
  },
]) {
  describe('50k ' + pantalla.nombre, () => {
    const registro = {
      id: 7,
      nombre: 'Catálogo de prueba',
      descripcion: 'Descripción',
      activo: true,
    };
    const permisos = { crear: true, editar: true, eliminar: true };

    async function crear(componente: Type<object>, acceso = permisos) {
      const servicio = {
        listar: vi
          .fn()
          .mockReturnValue(
            of({ data: [registro], total: 80, permisos: acceso }),
          ),
        obtener: vi
          .fn()
          .mockReturnValue(
            of({ [pantalla.registro]: registro, permisos: acceso }),
          ),
        crear: vi.fn(),
        actualizar: vi.fn(),
        desactivar: vi.fn(),
      };
      await TestBed.configureTestingModule({
        imports: [componente],
        deferBlockBehavior: DeferBlockBehavior.Manual,
        providers: [
          ...proveedoresDePantalla(),
          { provide: pantalla.servicio, useValue: servicio },
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: { paramMap: convertToParamMap({ id: '7' }) },
            },
          },
          { provide: AuditLogSource, useValue: { listar: () => of([]) } },
          {
            provide: ToastService,
            useValue: { success: vi.fn(), error: vi.fn() },
          },
          {
            provide: ConfirmDialogService,
            useValue: { confirm: vi.fn().mockResolvedValue(true) },
          },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(componente);
      fixture.detectChanges();
      return { fixture, servicio, host: fixture.nativeElement as HTMLElement };
    }

    afterEach(() => vi.useRealTimers());

    it('compone el listado con un h1, filtro y tabla compartidos', async () => {
      const { host } = await crear(pantalla.listado);
      expect(host.querySelectorAll('h1')).toHaveLength(1);
      expect(host.querySelector('ui-page-header h1')).not.toBeNull();
      expect(host.querySelector('ui-filter-bar')).not.toBeNull();
      expect(host.querySelector('ui-tabla')).not.toBeNull();
    });

    it('meta refleja la segunda página aunque el total permanezca igual', async () => {
      const { fixture, servicio } = await crear(pantalla.listado);
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

    for (const permiso of ['editar', 'eliminar'] as const) {
      it('oculta la acción de fila sin el permiso ' + permiso, async () => {
        const { host } = await crear(pantalla.listado, {
          ...permisos,
          [permiso]: false,
        });
        expect(host.querySelector('ui-tabla')).not.toBeNull();
        const etiqueta = permiso === 'editar' ? 'Editar' : 'Desactivar';
        expect(
          host.querySelector('button[aria-label="' + etiqueta + '"]'),
        ).toBeNull();
        const otra = permiso === 'editar' ? 'Desactivar' : 'Editar';
        expect(
          host.querySelector('button[aria-label="' + otra + '"]'),
        ).not.toBeNull();
      });
    }

    it('Limpiar cancela el filtro pendiente y conserva la barra al recargar', async () => {
      vi.useFakeTimers();
      const { fixture, servicio, host } = await crear(pantalla.listado);
      const input = host.querySelector<HTMLInputElement>('ui-filter-bar input');
      expect(input).not.toBeNull();
      ejecutar(fixture.componentInstance, 'onBuscarInput', 'pendiente');
      ejecutar(fixture.componentInstance, 'limpiarFiltros');
      fixture.detectChanges();
      expect(host.querySelector('ui-filter-bar input')).toBe(input);
      vi.advanceTimersByTime(300);
      expect(servicio.listar).toHaveBeenLastCalledWith(
        expect.objectContaining({ first: 0 }),
        '',
      );
      expect(input?.value).toBe('');
    });

    it('permite reintentar una carga fallida del listado', async () => {
      const { fixture, servicio, host } = await crear(pantalla.listado);
      servicio.listar.mockReturnValueOnce(
        throwError(() => new Error('sin conexión')),
      );
      ejecutar(fixture.componentInstance, 'onLazyLoad', { first: 0, rows: 25 });
      fixture.detectChanges();
      expect(host.textContent).toContain('No se pudo cargar');
      ejecutar(fixture.componentInstance, 'reintentar');
      fixture.detectChanges();
      expect(host.textContent).not.toContain('No se pudo cargar');
      expect(host.textContent).toContain(registro.nombre);
    });

    it('el detalle tiene un h1 compartido y conserva el nombre del registro', async () => {
      const { host } = await crear(pantalla.detalle);
      expect(host.querySelectorAll('h1')).toHaveLength(1);
      expect(host.querySelector('ui-page-header h1')).not.toBeNull();
      expect(host.querySelector('h2')?.textContent).toContain(registro.nombre);
    });

    it('permite reintentar una carga fallida del detalle', async () => {
      const { fixture, servicio, host } = await crear(pantalla.detalle);
      servicio.obtener.mockReturnValueOnce(
        throwError(() => new Error('sin conexión')),
      );
      ejecutar(fixture.componentInstance, 'reintentar');
      fixture.detectChanges();
      expect(host.textContent).toContain('No se pudo cargar');
      ejecutar(fixture.componentInstance, 'reintentar');
      fixture.detectChanges();
      expect(host.textContent).not.toContain('No se pudo cargar');
      expect(servicio.obtener).toHaveBeenLastCalledWith(7);
    });

    for (const modo of ['crear', 'detalle'] as const) {
      it(
        'el formulario de ' +
          modo +
          ' bloquea el envío en curso y conserva el campo tras un 422',
        async () => {
          const { fixture, servicio, host } = await crear(pantalla[modo]);
          const respuesta = new Subject<never>();
          servicio[modo === 'crear' ? 'crear' : 'actualizar'].mockReturnValue(
            respuesta,
          );
          const dinamico = fixture.debugElement.query(
            By.directive(DynamicFormComponent),
          ).componentInstance as DynamicFormComponent;
          dinamico.form.setValue({
            nombre: 'Nombre conservado',
            descripcion: 'Texto conservado',
          });
          ejecutar(
            fixture.componentInstance,
            'onGuardar',
            dinamico.form.getRawValue(),
          );
          fixture.detectChanges();
          const boton = host.querySelector<HTMLButtonElement>(
            'nucleo-dynamic-form button[type="submit"]',
          );
          expect(boton?.disabled).toBe(true);
          expect(boton?.getAttribute('aria-busy')).toBe('true');
          expect(dinamico.form.get('nombre')?.value).toBe('Nombre conservado');
          respuesta.error(
            new HttpErrorResponse({
              status: 422,
              error: { errors: { nombre: ['Nombre duplicado'] } },
            }),
          );
          fixture.detectChanges();
          expect(boton?.disabled).toBe(false);
          expect(dinamico.form.get('nombre')?.value).toBe('Nombre conservado');
          expect(dinamico.form.get('nombre')?.hasError('server')).toBe(true);
          expect(host.textContent).toContain('Nombre duplicado');
        },
      );
    }
  });
}
