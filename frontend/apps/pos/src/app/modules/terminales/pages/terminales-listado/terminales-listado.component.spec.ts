import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { REGISTRO_NAVEGACION } from '@nianva/ui-layout';
import { Subject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TerminalListadoService } from '@nianva/domain-nucleo';
import { TerminalesListadoComponent } from './terminales-listado.component';

const respuesta = {
  data: [{ id: 1, nombre: 'Primero', sucursal_id: 1 }],
  meta: { total: 1, page: 1, rows: 25, filtros_aplicados: {}, permisos: {} },
};

describe('TerminalesListadoComponent', () => {
  let listar: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listar = vi.fn(() => of(respuesta));
    TestBed.configureTestingModule({
      imports: [TerminalesListadoComponent],
      providers: [
        provideRouter([]),
        { provide: TerminalListadoService, useValue: { listar } },
        { provide: REGISTRO_NAVEGACION, useValue: [{ clave: 'terminales', ruta: 'terminales', nombre: 'Terminales', icono: 'pi pi-list' }] },
      ],
    });
  });

  function crear() {
    const fixture = TestBed.createComponent(TerminalesListadoComponent);
    fixture.detectChanges();

    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('carga la primera pagina al iniciar', () => {
    const { el } = crear();

    expect(listar).toHaveBeenCalledWith({ page: 1, rows: 25 });
    expect(el.textContent).toContain('Primero');
  });

  it('busca desde la primera pagina con q', () => {
    const { fixture } = crear();

    fixture.componentInstance['buscar']('abc');

    expect(listar).toHaveBeenLastCalledWith({ page: 1, rows: 25, q: 'abc' });
  });

  it('si la carga falla, muestra el error con Reintentar', () => {
    const fallo = new Subject<never>();
    listar.mockReturnValueOnce(fallo);
    const { fixture, el } = crear();

    fallo.error(new Error('500'));
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')).not.toBeNull();
  });
});
