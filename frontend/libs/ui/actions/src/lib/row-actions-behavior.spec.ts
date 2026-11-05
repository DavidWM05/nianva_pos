import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccionFila, RowActionsComponent } from './row-actions.component';

type AccionInterna = {
  tipo: string;
  tono: 'secondary' | 'danger';
  motivoDeshabilitada?: string;
};

type MenuInterno = {
  label: string;
  disabled?: boolean;
  command?: () => void;
};

type Interno = {
  accionesOrdenadas: () => AccionInterna[];
  menuItems: () => MenuInterno[];
};

describe('RowActionsComponent comportamiento', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RowActionsComponent] });
  });

  function render(acciones: AccionFila[]) {
    const fixture = TestBed.createComponent(RowActionsComponent);
    fixture.componentRef.setInput('acciones', acciones);
    fixture.detectChanges();

    return fixture;
  }

  function interno(fixture: ReturnType<typeof render>): Interno {
    return fixture.componentInstance as unknown as Interno;
  }

  it('reserva el tono de peligro para eliminar y anular', () => {
    const fixture = render([
      { tipo: 'ver' },
      { tipo: 'editar' },
      { tipo: 'eliminar' },
      { tipo: 'anular' },
    ]);

    const peligrosas = interno(fixture)
      .accionesOrdenadas()
      .filter((accion) => accion.tono === 'danger')
      .map((accion) => accion.tipo);

    expect(peligrosas).toEqual(['eliminar', 'anular']);
  });

  it('mantiene en el menu las acciones que no caben, en orden', () => {
    const fixture = render([
      { tipo: 'anular' },
      { tipo: 'eliminar' },
      { tipo: 'historial' },
      { tipo: 'custom', id: 'pdf', icono: 'pi pi-file-pdf', descripcion: 'PDF' },
      { tipo: 'ver' },
      { tipo: 'editar' },
      { tipo: 'imprimir' },
    ]);

    expect(interno(fixture).menuItems().map((item) => item.label)).toEqual([
      'Imprimir',
      'Historial',
      'PDF',
      'Eliminar',
      'Anular',
    ]);
  });

  it('un item del menu con motivo queda deshabilitado y no ejecuta', () => {
    const fixture = render([
      { tipo: 'ver' },
      { tipo: 'editar' },
      { tipo: 'historial' },
      { tipo: 'eliminar', motivoDeshabilitada: 'Documento protegido' },
    ]);
    const emitir = vi.fn();
    fixture.componentInstance.accion.subscribe(emitir);

    const item = interno(fixture).menuItems().at(-1);
    expect(item?.label).toContain('Eliminar');
    expect(item?.label).toContain('Documento protegido');
    expect(item?.disabled).toBe(true);
    item?.command?.();

    expect(emitir).not.toHaveBeenCalled();
  });

  it('emite la accion custom desde el menu', () => {
    const fixture = render([
      { tipo: 'ver' },
      { tipo: 'editar' },
      { tipo: 'historial' },
      { tipo: 'custom', id: 'pdf', icono: 'pi pi-file-pdf', descripcion: 'PDF' },
    ]);
    const emitir = vi.fn();
    fixture.componentInstance.accion.subscribe(emitir);

    const item = interno(fixture).menuItems().find((menuItem) => menuItem.label === 'PDF');
    item?.command?.();

    expect(emitir).toHaveBeenCalledWith({ tipo: 'custom', id: 'pdf' });
  });
});
