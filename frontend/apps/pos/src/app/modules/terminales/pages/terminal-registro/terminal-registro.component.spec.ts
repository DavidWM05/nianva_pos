import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Sesion, SesionActualService } from '@nianva/domain-sesion';
import { ConfirmDialogService, ToastService } from '@nianva/ui-feedback';
import { Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { BUSCADOR_SUCURSAL } from '../../../../core/buscadores-entidad.tokens';
import { proveedoresDePantalla } from '../../../../testing/proveedores-pantalla';
import { TerminalListadoService } from '@nianva/domain-nucleo';
import { TerminalRegistroComponent } from './terminal-registro.component';

describe('TerminalRegistroComponent', () => {
  const terminal = { id: 9, nombre: 'Caja de sucursal', sucursal_id: 3 };

  function montar(id: string | null, permisos: string[]) {
    const respuesta = new Subject<typeof terminal>();
    const obtener = vi.fn(() => respuesta);
    const crear = vi.fn(() => of(terminal));
    const actualizar = vi.fn(() => of(terminal));
    const eliminar = vi.fn(() => of(void 0));
    const confirmarEliminacion = vi.fn(async () => true);
    const toast = { error: vi.fn(), success: vi.fn() };
    const sucursales = [{ id: 2, nombre: 'Centro' }, { id: 3, nombre: 'Norte' }];
    const buscador = { buscar: vi.fn(() => of(sucursales)), obtener: vi.fn((clave: number) => of(sucursales.find((sucursal) => sucursal.id === clave))) };
    TestBed.configureTestingModule({
      imports: [TerminalRegistroComponent],
      providers: [
        ...proveedoresDePantalla(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id === null ? {} : { id }) } } },
        { provide: TerminalListadoService, useValue: { obtener, crear, actualizar, eliminar } },
        { provide: ConfirmDialogService, useValue: { confirmarEliminacion } },
        { provide: BUSCADOR_SUCURSAL, useValue: buscador },
        { provide: ToastService, useValue: toast },
      ],
    });
    TestBed.inject(SesionActualService).establecer({
      permisos, sucursal: sucursales[0], terminal: null,
    } as Sesion);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(TerminalRegistroComponent);
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    return { fixture, el: fixture.nativeElement as HTMLElement, componente, respuesta, obtener, crear, actualizar, eliminar, confirmarEliminacion, buscador, toast };
  }

  it('con usuarios.ver y sucursales.todas puede seleccionar la sucursal para crear', () => {
    const { el, componente, crear } = montar(null, ['usuarios.ver', 'sucursales.todas', 'terminales.administrar']);
    expect(el.querySelector('nucleo-entidad-selector')).not.toBeNull();
    componente['nombre'].setValue('  Caja nueva  ');
    componente['sucursalId'].set(3);
    componente['guardar']();

    expect(crear).toHaveBeenCalledWith({ nombre: 'Caja nueva', sucursal_id: 3 });
  });

  it('sin ambos permisos crea en la sucursal de la sesión sin consultar sucursales', () => {
    const { el, componente, crear, buscador } = montar(null, ['terminales.administrar', 'sucursales.todas']);
    expect(el.textContent).toContain('Sucursal: Centro');
    expect(el.querySelector('nucleo-entidad-selector')).toBeNull();
    componente['guardar']();
    expect(crear).not.toHaveBeenCalled();

    componente['nombre'].setValue('Caja nueva');
    componente['guardar']();
    expect(crear).toHaveBeenCalledWith({ nombre: 'Caja nueva', sucursal_id: 2 });
    expect(buscador.buscar).not.toHaveBeenCalled();
    expect(buscador.obtener).not.toHaveBeenCalled();
  });

  it('carga la terminal, conserva su sucursal al editar y muestra el rechazo del servidor', () => {
    const { fixture, el, componente, respuesta, obtener, actualizar, toast, buscador } = montar('9', ['terminales.administrar', 'usuarios.ver']);
    expect(obtener).toHaveBeenCalledWith(9);
    expect(el.querySelector('ui-skeleton')).not.toBeNull();

    respuesta.next(terminal);
    respuesta.complete();
    fixture.detectChanges();
    expect(el.textContent).toContain('Sucursal: Sucursal 3');
    expect(el.querySelector('nucleo-entidad-selector')).toBeNull();

    const guardado = new Subject<typeof terminal>();
    actualizar.mockReturnValue(guardado);
    componente['nombre'].setValue('Caja editada');
    componente['guardar']();
    fixture.detectChanges();
    expect(el.querySelector('button[type="submit"]')?.getAttribute('aria-busy')).toBe('true');
    expect(actualizar).toHaveBeenCalledWith(9, { nombre: 'Caja editada', sucursal_id: 3 });
    guardado.error({ error: { message: 'Sucursal fuera del alcance.' } });
    expect(toast.error).toHaveBeenCalledWith('Sucursal fuera del alcance.');
    expect(buscador.obtener).not.toHaveBeenCalled();
  });

  it('pide confirmación para borrar y muestra el rechazo sin salir del registro', async () => {
    const { componente, respuesta, confirmarEliminacion, eliminar, toast } = montar('9', ['terminales.administrar']);
    respuesta.next(terminal);
    confirmarEliminacion.mockResolvedValueOnce(false);
    await componente['eliminar']();
    expect(eliminar).not.toHaveBeenCalled();

    eliminar.mockReturnValue(throwError(() => ({ error: { message: 'La terminal está en uso.' } })));
    await componente['eliminar']();
    expect(eliminar).toHaveBeenCalledWith(9);
    expect(toast.error).toHaveBeenCalledWith('La terminal está en uso.');
  });

  it('el alta usa la sucursal si GET /sesion termina después de abrir el formulario', () => {
    const { fixture, componente, el, crear } = montar(null, []);
    const sesion = TestBed.inject(SesionActualService);
    sesion.establecer({ permisos: ['terminales.administrar'], terminal: null, sucursal: { id: 7, nombre: 'Nueva sucursal' } } as Sesion);
    fixture.detectChanges();
    expect(el.textContent).toContain('Sucursal: Nueva sucursal');
    componente['nombre'].setValue('Caja reciente');
    componente['guardar']();
    expect(crear).toHaveBeenCalledWith({ nombre: 'Caja reciente', sucursal_id: 7 });
  });
});
