import { TestBed } from '@angular/core/testing';
import { AuthApiService, Sesion, SesionActualService } from '@nianva/domain-sesion';
import { ToastService } from '@nianva/ui-feedback';
import { Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { TerminalListadoService } from '@nianva/domain-nucleo';
import { TerminalDeSesionComponent } from './terminal-de-sesion.component';

describe('TerminalDeSesionComponent', () => {
  const terminal = { id: 9, nombre: 'Caja principal', sucursal_id: 2 };
  const otra = { ...terminal, id: 12, nombre: 'Caja auxiliar' };

  function crear(permisos: string[], actual: typeof terminal | null = terminal) {
    const datos = { permisos, terminal: actual, sucursal: { id: 2, nombre: 'Centro' } } as Sesion;
    const lista = new Subject<(typeof terminal)[]>();
    const listarDeSucursal = vi.fn(() => lista);
    const elegirTerminal = vi.fn(() => of(void 0));
    const obtenerSesion = vi.fn(() => of({ ...datos, terminal: otra }));
    const toast = { success: vi.fn(), error: vi.fn() };
    TestBed.configureTestingModule({
      imports: [TerminalDeSesionComponent],
      providers: [
        { provide: TerminalListadoService, useValue: { listarDeSucursal } },
        { provide: AuthApiService, useValue: { elegirTerminal, obtenerSesion } },
        { provide: ToastService, useValue: toast },
      ],
    });
    const sesion = TestBed.inject(SesionActualService);
    sesion.establecer(datos);
    const fixture = TestBed.createComponent(TerminalDeSesionComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, lista, listarDeSucursal, elegirTerminal, obtenerSesion, sesion, toast };
  }

  it('con permiso carga, elige y guarda la terminal y refresca GET /sesion', () => {
    const { fixture, el, lista, listarDeSucursal, elegirTerminal, obtenerSesion, sesion } = crear(['terminales.administrar']);
    expect(el.querySelector('ui-skeleton')).not.toBeNull();
    expect(listarDeSucursal).toHaveBeenCalledWith(2);
    lista.next([terminal, otra]);
    lista.complete();
    fixture.detectChanges();

    const selector = el.querySelector('select');
    if (!selector) throw Error('Falta el selector de terminal');
    selector.selectedIndex = 2;
    selector.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    el.querySelector('button')?.click();
    fixture.detectChanges();

    expect(elegirTerminal).toHaveBeenCalledWith(12);
    expect(obtenerSesion).toHaveBeenCalledOnce();
    expect(sesion.sesion()?.terminal).toEqual(otra);
    expect(el.textContent).toContain('Terminal actual: Caja auxiliar');
  });

  it('sin permiso muestra la terminal actual sin consultar el listado ni presentar acciones', () => {
    const { el, listarDeSucursal } = crear([]);

    expect(el.textContent).toContain('Terminal actual: Caja principal');
    expect(el.querySelector('select, button')).toBeNull();
    expect(listarDeSucursal).not.toHaveBeenCalled();
  });

  it('muestra Sin terminal cuando la sesión no tiene una elegida', () => {
    expect(crear([], null).el.textContent).toContain('Sin terminal');
  });

  it('muestra el error del servidor y conserva la terminal ante un rechazo', () => {
    const { fixture, lista, elegirTerminal, obtenerSesion, sesion, toast } = crear(['terminales.administrar']);
    lista.next([terminal, otra]);
    lista.complete();
    elegirTerminal.mockImplementation(() => throwError(() => ({ error: { message: 'Terminal fuera de la sucursal.' } })));
    fixture.componentInstance['terminalId'].setValue(otra.id);
    fixture.componentInstance['guardar']();

    expect(toast.error).toHaveBeenCalledWith('Terminal fuera de la sucursal.');
    expect(obtenerSesion).not.toHaveBeenCalled();
    expect(sesion.sesion()?.terminal).toEqual(terminal);
  });
});
