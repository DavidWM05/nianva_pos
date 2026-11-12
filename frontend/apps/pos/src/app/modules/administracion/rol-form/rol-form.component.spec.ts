import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DynamicFormComponent } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GrupoPermisos } from '../permiso.types';
import { PermisoService } from '../permiso.service';
import { RolFormPayload } from '../rol.service';
import { Rol } from '../rol.types';
import { RolFormComponent } from './rol-form.component';

const GRUPOS: GrupoPermisos[] = [
  {
    modulo: 'usuarios',
    permisos: [
      { id: 1, modulo: 'usuarios', accion: 'ver', nombre: 'usuarios.ver', descripcion: null },
      { id: 2, modulo: 'usuarios', accion: 'crear', nombre: 'usuarios.crear', descripcion: null },
    ],
  },
];

const ROL: Rol = { id: 7, nombre: 'Cajero', descripcion: null, es_sistema: false, permisos: [1] };

describe('RolFormComponent', () => {
  let fixture: ComponentFixture<RolFormComponent>;
  let emitidos: RolFormPayload[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolFormComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: PermisoService, useValue: { agrupadosPorModulo: vi.fn().mockReturnValue(of(GRUPOS)) } },
      ],
    }).compileComponents();
  });

  async function crear(valorInicial: Rol | null = null, readonly = false): Promise<void> {
    fixture = TestBed.createComponent(RolFormComponent);
    fixture.componentRef.setInput('valorInicial', valorInicial);
    fixture.componentRef.setInput('readonly', readonly);
    emitidos = [];
    fixture.componentInstance.guardar.subscribe((payload) => emitidos.push(payload));
    fixture.detectChanges();
    await fixture.whenStable();
    // ngModel aplica [disabled] en una microtarea: una pasada mas para verlo en el DOM.
    fixture.detectChanges();
  }

  const raiz = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const formulario = (): DynamicFormComponent => fixture.debugElement.query(By.directive(DynamicFormComponent)).componentInstance;
  const casilla = (etiqueta: string): HTMLInputElement | null =>
    [...raiz().querySelectorAll('mat-checkbox')]
      .find((c) => c.textContent?.trim() === etiqueta)
      ?.querySelector('input[type="checkbox"]') ?? null;
  const enviar = (): void => raiz().querySelector<HTMLButtonElement>('button[type="submit"]')?.click();

  it('los permisos van dentro del formulario, antes del boton de envio', async () => {
    await crear();

    const permisos = raiz().querySelector('ui-checklist-agrupado');
    const boton = raiz().querySelector('button[type="submit"]');

    expect(permisos?.closest('form')).toBe(raiz().querySelector('form'));
    expect(permisos && boton ? permisos.compareDocumentPosition(boton) & Node.DOCUMENT_POSITION_FOLLOWING : 0).toBeTruthy();
  });

  it('al crear, los permisos marcados viajan en el payload', async () => {
    await crear();
    formulario().form.patchValue({ nombre: 'Supervisor' });

    casilla('Crear')?.click();
    enviar();

    expect(emitidos).toHaveLength(1);
    expect(emitidos[0]).toMatchObject({ nombre: 'Supervisor', permisos: [2] });
  });

  it('al editar, los permisos del rol viajan en el payload y se pueden cambiar', async () => {
    await crear(ROL);

    enviar();
    expect(emitidos[0]).toMatchObject({ nombre: 'Cajero', permisos: [1] });

    casilla('Crear')?.click();
    enviar();
    expect(emitidos[1].permisos).toEqual([1, 2]);
  });

  it('en solo lectura, los permisos tambien quedan deshabilitados, sin filtro ni "Seleccionar todos"', async () => {
    await crear(ROL, true);

    const casillas = [...raiz().querySelectorAll<HTMLInputElement>('ui-checklist-agrupado input[type="checkbox"]')];

    expect(formulario().form.disabled).toBe(true);
    expect(casillas.length).toBe(2);
    expect(casillas.every((c) => c.disabled)).toBe(true);
    expect(raiz().querySelector('.ui-checklist__filtro')).toBeNull();
    expect(raiz().textContent).not.toContain('Seleccionar todos');
  });
});
