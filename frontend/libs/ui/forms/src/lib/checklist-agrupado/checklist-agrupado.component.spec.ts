import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';

import { ChecklistAgrupadoComponent, GrupoChecklist, IdOpcionChecklist } from './checklist-agrupado.component';

const GRUPOS: GrupoChecklist[] = [
  {
    id: 'usuarios',
    etiqueta: 'Usuarios',
    opciones: [
      { id: 1, etiqueta: 'Ver' },
      { id: 2, etiqueta: 'Crear' },
      { id: 3, etiqueta: 'Editar', descripcion: 'Cambiar datos y contraseña' },
    ],
  },
  {
    id: 'cobranza',
    etiqueta: 'Cobranza',
    opciones: [
      { id: 10, etiqueta: 'Ver' },
      { id: 11, etiqueta: 'Registrar abono' },
    ],
  },
];

@Component({
  standalone: true,
  imports: [ChecklistAgrupadoComponent, ReactiveFormsModule],
  template: `<ui-checklist-agrupado etiqueta="Permisos" etiquetaFiltro="Filtrar permisos" [grupos]="grupos" [formControl]="control" />`,
})
class Anfitrion {
  grupos = GRUPOS;
  control = new FormControl<readonly IdOpcionChecklist[]>([]);
}

describe('ChecklistAgrupadoComponent', () => {
  let fixture: ComponentFixture<Anfitrion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Anfitrion],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
  });

  async function crear(valor: IdOpcionChecklist[] = [], deshabilitado = false): Promise<void> {
    fixture = TestBed.createComponent(Anfitrion);
    fixture.componentInstance.control.setValue(valor);
    if (deshabilitado) {
      fixture.componentInstance.control.disable();
    }
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const raiz = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const control = (): FormControl<readonly IdOpcionChecklist[] | null> => fixture.componentInstance.control;
  const grupo = (etiqueta: string): HTMLFieldSetElement | undefined =>
    [...raiz().querySelectorAll<HTMLFieldSetElement>('fieldset.ui-checklist__grupo')].find(
      (f) => f.querySelector('legend')?.textContent?.trim() === etiqueta,
    );
  const casilla = (etiquetaGrupo: string, etiqueta: string): HTMLInputElement | null =>
    [...(grupo(etiquetaGrupo)?.querySelectorAll('mat-checkbox') ?? [])]
      // La etiqueta es el primer texto del label; la descripcion, si hay, va despues.
      .find((c) => c.querySelector('.mdc-label')?.firstChild?.textContent?.trim() === etiqueta)
      ?.querySelector('input[type="checkbox"]') ?? null;
  const filtrar = (texto: string): void => {
    const input = raiz().querySelector<HTMLInputElement>('.ui-checklist__filtro input');
    if (input) {
      input.value = texto;
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
  };
  const ordenado = (valor: readonly IdOpcionChecklist[] | null): IdOpcionChecklist[] =>
    [...(valor ?? [])].sort((a, b) => Number(a) - Number(b));

  it('pinta un fieldset con su legend por grupo y un mat-checkbox por opcion', async () => {
    await crear();

    expect(raiz().querySelector('legend.ui-checklist__titulo')?.textContent?.trim()).toBe('Permisos');
    expect([...raiz().querySelectorAll('legend.ui-checklist__legend')].map((l) => l.textContent?.trim())).toEqual(['Usuarios', 'Cobranza']);
    expect(grupo('Usuarios')?.querySelectorAll('mat-checkbox').length).toBe(4); // 3 opciones + "Seleccionar todos"
    expect(casilla('Cobranza', 'Registrar abono')).not.toBeNull();
  });

  it('refleja el valor del FormControl y lo actualiza al marcar', async () => {
    await crear([1]);

    expect(casilla('Usuarios', 'Ver')?.checked).toBe(true);
    casilla('Usuarios', 'Crear')?.click();

    expect(ordenado(control().value)).toEqual([1, 2]);
    expect(control().touched).toBe(true);
  });

  it('cada grupo muestra su contador y hay un contador total', async () => {
    await crear([1, 10, 11]);

    expect(grupo('Usuarios')?.textContent).toContain('1 de 3');
    expect(grupo('Cobranza')?.textContent).toContain('2 de 2');
    expect(raiz().querySelector('.ui-checklist__total')?.textContent).toContain('Seleccionados: 3 de 5');
  });

  it('"Seleccionar todos" marca el grupo y muestra estado intermedio con algunas marcadas', async () => {
    await crear([1]);
    const todos = casilla('Usuarios', 'Seleccionar todos');

    expect(todos?.indeterminate).toBe(true);
    todos?.click();

    expect(ordenado(control().value)).toEqual([1, 2, 3]);
  });

  it('el filtro oculta opciones pero no las desmarca: lo oculto se sigue guardando', async () => {
    await crear([1, 10]);

    filtrar('abono');

    expect(grupo('Usuarios')).toBeUndefined();
    expect(casilla('Cobranza', 'Ver')).toBeNull();
    casilla('Cobranza', 'Registrar abono')?.click();

    expect(ordenado(control().value)).toEqual([1, 10, 11]);
    fixture.detectChanges();
    expect(raiz().querySelector('.ui-checklist__total')?.textContent).toContain('Seleccionados: 3 de 5');
  });

  it('con el filtro, "Seleccionar todos" solo afecta a las opciones visibles del grupo', async () => {
    await crear([]);

    filtrar('abono');
    casilla('Cobranza', 'Seleccionar visibles')?.click();

    expect(ordenado(control().value)).toEqual([11]);
  });

  it('el filtro no distingue acentos ni mayusculas, y busca en grupo, etiqueta y descripcion', async () => {
    await crear();

    filtrar('CONTRASENA');
    expect(casilla('Usuarios', 'Editar')).not.toBeNull();
    expect(casilla('Usuarios', 'Ver')).toBeNull();

    filtrar('cobranza');
    expect(grupo('Cobranza')?.querySelectorAll('mat-checkbox').length).toBe(3);
    expect(grupo('Usuarios')).toBeUndefined();
  });

  it('el label del filtro apunta a su input', async () => {
    await crear();

    const label = raiz().querySelector('.ui-checklist__filtro label');

    expect(label?.textContent?.trim()).toBe('Filtrar permisos');
    expect(document.getElementById(label?.getAttribute('for') ?? '')?.tagName).toBe('INPUT');
  });

  it('con el FormControl deshabilitado: todo deshabilitado, sin filtro ni "Seleccionar todos"', async () => {
    await crear([1], true);

    const casillas = [...raiz().querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];

    expect(raiz().querySelector('.ui-checklist__filtro')).toBeNull();
    expect(raiz().textContent).not.toContain('Seleccionar todos');
    expect(casillas.length).toBe(5);
    expect(casillas.every((c) => c.disabled)).toBe(true);
  });

  it('al habilitar el FormControl vuelven el filtro y los "Seleccionar todos"', async () => {
    await crear([1], true);

    control().enable();
    fixture.detectChanges();

    expect(raiz().querySelector('.ui-checklist__filtro')).not.toBeNull();
    expect(raiz().textContent).toContain('Seleccionar todos');
  });

  it('con filtro, la casilla del grupo dice "Seleccionar visibles"; sin filtro, "Seleccionar todos"', async () => {
    await crear();

    expect(casilla('Usuarios', 'Seleccionar todos')).not.toBeNull();

    filtrar('ver');

    expect(casilla('Usuarios', 'Seleccionar visibles')).not.toBeNull();
    expect(casilla('Usuarios', 'Seleccionar todos')).toBeNull();

    filtrar('');

    expect(casilla('Usuarios', 'Seleccionar todos')).not.toBeNull();
  });

  it('con filtro, marcar y desmarcar los visibles no toca las opciones ocultas', async () => {
    await crear([2]);

    filtrar('ver');
    casilla('Usuarios', 'Seleccionar visibles')?.click();
    expect(ordenado(control().value)).toEqual([1, 2]);

    fixture.detectChanges();
    casilla('Usuarios', 'Seleccionar visibles')?.click();
    expect(ordenado(control().value)).toEqual([2]);
  });

  it('con filtro y opciones ocultas sin marcar, ninguna casilla dice "todo marcado" aunque las visibles lo esten', async () => {
    await crear([1]);

    filtrar('ver');
    const visibles = casilla('Usuarios', 'Seleccionar visibles');

    // Refleja solo las visibles (Ver), pero no se presenta como "Seleccionar todos".
    expect(visibles?.checked).toBe(true);
    expect(casilla('Usuarios', 'Seleccionar todos')).toBeNull();
    // El contador del grupo sigue contando el grupo completo.
    expect(grupo('Usuarios')?.textContent).toContain('1 de 3');
  });
});
