import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccionFila, RowActionsComponent } from './row-actions.component';

type Interno = {
  menuItems: () => Array<{ label: string; disabled?: boolean; command?: () => void }>;
};

describe('RowActionsComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RowActionsComponent] });
  });

  function render(acciones: AccionFila[]) {
    const fixture = TestBed.createComponent(RowActionsComponent);
    fixture.componentRef.setInput('acciones', acciones);
    fixture.detectChanges();

    return fixture;
  }

  function botones(fixture: ReturnType<typeof render>): HTMLButtonElement[] {
    return [...fixture.nativeElement.querySelectorAll('.ui-row-actions__accion')] as HTMLButtonElement[];
  }

  it('ordena ver, editar, imprimir, historial, custom, estado, eliminar y anular', () => {
    const fixture = render([
      { tipo: 'anular' },
      { tipo: 'eliminar' },
      { tipo: 'estado', activo: true },
      { tipo: 'custom', id: 'pdf', icono: 'pi pi-file-pdf', descripcion: 'PDF' },
      { tipo: 'historial' },
      { tipo: 'editar' },
      { tipo: 'imprimir' },
      { tipo: 'ver' },
    ]);

    expect(botones(fixture).map((b) => b.getAttribute('aria-label'))).toEqual(['Ver', 'Editar']);
    expect((fixture.componentInstance as unknown as Interno).menuItems().map((i) => i.label)).toEqual([
      'Imprimir',
      'Historial',
      'PDF',
      'Desactivar',
      'Eliminar',
      'Anular',
    ]);
  });

  it('pone title y aria-label a cada boton', () => {
    const fixture = render([{ tipo: 'ver' }, { tipo: 'editar' }, { tipo: 'historial' }]);

    for (const boton of botones(fixture)) {
      expect(boton.getAttribute('title')).toBe(boton.getAttribute('aria-label'));
      expect(boton.getAttribute('aria-label')).not.toBeNull();
    }
  });

  it('cambia la etiqueta de estado segun activo', () => {
    const activo = render([{ tipo: 'estado', activo: true }]);
    const inactivo = render([{ tipo: 'estado', activo: false }]);

    expect(botones(activo)[0]?.getAttribute('aria-label')).toBe('Desactivar');
    expect(botones(inactivo)[0]?.getAttribute('aria-label')).toBe('Activar');
  });

  it('con mas de tres acciones muestra dos iconos y el menu de mas acciones', () => {
    const fixture = render([
      { tipo: 'ver' },
      { tipo: 'editar' },
      { tipo: 'historial' },
      { tipo: 'eliminar' },
    ]);

    expect(botones(fixture)).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('.ui-row-actions__menu')?.getAttribute('aria-label')).toBe('Más acciones');
  });

  it('una accion con motivo queda deshabilitada, muestra el motivo y no emite', () => {
    const fixture = render([{ tipo: 'ver', motivoDeshabilitada: 'Solo lectura' }]);
    const emitir = vi.fn();
    fixture.componentInstance.accion.subscribe(emitir);

    const boton = botones(fixture)[0];
    expect(boton?.disabled).toBe(true);
    expect(boton?.getAttribute('aria-label')).toBe('Ver: Solo lectura');
    boton?.click();

    expect(emitir).not.toHaveBeenCalled();
  });

  it('emite la accion del boton y del menu', () => {
    const fixture = render([{ tipo: 'ver' }, { tipo: 'custom', id: 'pdf', icono: 'pi pi-file-pdf', descripcion: 'PDF' }, { tipo: 'editar' }, { tipo: 'eliminar' }]);
    const emitir = vi.fn();
    fixture.componentInstance.accion.subscribe(emitir);

    botones(fixture)[0]?.click();
    expect(emitir).toHaveBeenCalledWith({ tipo: 'ver' });

    const menu = (fixture.componentInstance as unknown as Interno).menuItems();
    menu[0]?.command?.();
    expect(emitir).toHaveBeenCalledWith({ tipo: 'custom', id: 'pdf' });
  });

  it('no pinta la descripcion de custom como texto visible', () => {
    const fixture = render([{ tipo: 'custom', id: 'pdf', icono: 'pi pi-file-pdf', descripcion: 'Exportar PDF' }]);

    expect(fixture.nativeElement.textContent).not.toContain('Exportar PDF');
    expect(botones(fixture)[0]?.getAttribute('aria-label')).toBe('Exportar PDF');
  });
});
