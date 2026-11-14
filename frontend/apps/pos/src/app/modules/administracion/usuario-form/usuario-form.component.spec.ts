import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DynamicFormComponent } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RolService } from '../rol.service';
import { SucursalService } from '../sucursal.service';
import { UsuarioFormPayload } from '../usuario-admin.service';
import { UsuarioAdmin } from '../usuario.types';
import { UsuarioFormComponent } from './usuario-form.component';

const USUARIO: UsuarioAdmin = {
  id: 6,
  nombre: 'Carlos',
  apellido: 'Ruiz',
  alias: null,
  correo: 'carlos@test.com',
  telefono: null,
  activo: true,
  ultimo_login: null,
  dos_factor_confirmado: false,
  sucursal: { id: 2, nombre: 'Norte' },
  roles: [{ id: 1, nombre: 'vendedor' }],
};

describe('UsuarioFormComponent', () => {
  let fixture: ComponentFixture<UsuarioFormComponent>;
  let emitidos: UsuarioFormPayload[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuarioFormComponent],
      providers: [
        provideAnimationsAsync(),
        {
          provide: SucursalService,
          useValue: {
            listar: vi.fn().mockReturnValue(
              of([
                { id: 1, nombre: 'Centro' },
                { id: 2, nombre: 'Norte' },
              ]),
            ),
          },
        },
        {
          provide: RolService,
          useValue: {
            listarTodos: vi.fn().mockReturnValue(
              of([
                { id: 1, nombre: 'vendedor', descripcion: null, es_sistema: true },
                { id: 3, nombre: 'Cajero', descripcion: null, es_sistema: false },
              ]),
            ),
          },
        },
      ],
    }).compileComponents();
  });

  async function crear(valorInicial: UsuarioAdmin | null = null, readonly = false): Promise<void> {
    fixture = TestBed.createComponent(UsuarioFormComponent);
    fixture.componentRef.setInput('valorInicial', valorInicial);
    fixture.componentRef.setInput('readonly', readonly);
    emitidos = [];
    fixture.componentInstance.guardar.subscribe((payload) => emitidos.push(payload));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const raiz = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const formulario = (): DynamicFormComponent => fixture.debugElement.query(By.directive(DynamicFormComponent)).componentInstance;

  async function elegir(idSelect: string, opcion: string): Promise<void> {
    raiz().querySelector<HTMLElement>(`#${idSelect}`)?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((o) => o.textContent?.trim() === opcion)?.click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function llenarObligatorios(): void {
    formulario().form.patchValue({ nombre: 'Ana', correo: 'ana@test.com', password: 'password-valida-123' });
  }

  function enviar(): void {
    raiz().querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
  }

  it('Sucursal y Roles van dentro del formulario, antes del boton de envio', async () => {
    await crear();

    const form = raiz().querySelector('form');
    const roles = raiz().querySelector('#usuario-roles');
    const boton = raiz().querySelector('button[type="submit"]');

    expect(roles?.closest('form')).toBe(form);
    expect(raiz().querySelector('#usuario-sucursal')?.closest('form')).toBe(form);
    expect(roles && boton ? roles.compareDocumentPosition(boton) & Node.DOCUMENT_POSITION_FOLLOWING : 0).toBeTruthy();
  });

  it('al crear, la sucursal y los roles elegidos viajan en el payload', async () => {
    await crear();
    llenarObligatorios();

    await elegir('usuario-sucursal', 'Norte');
    await elegir('usuario-roles', 'Cajero');
    enviar();

    expect(emitidos).toHaveLength(1);
    expect(emitidos[0]).toMatchObject({ nombre: 'Ana', correo: 'ana@test.com', sucursal_id: 2, roles: [3] });
  });

  it('al crear sin sucursal (con un rol elegido), el payload lleva sucursal null', async () => {
    await crear();
    llenarObligatorios();

    await elegir('usuario-roles', 'Cajero');
    enviar();

    expect(emitidos).toHaveLength(1);
    expect(emitidos[0]).toMatchObject({ sucursal_id: null, roles: [3] });
  });

  it('al editar, la sucursal y los roles del usuario viajan en el payload, y se pueden cambiar', async () => {
    await crear(USUARIO);

    enviar();
    expect(emitidos[0]).toMatchObject({ sucursal_id: 2, roles: [1] });

    await elegir('usuario-roles', 'Cajero');
    enviar();
    expect(emitidos[1]).toMatchObject({ sucursal_id: 2, roles: [1, 3] });
  });

  it('en solo lectura, Sucursal y Roles tambien quedan deshabilitados', async () => {
    await crear(USUARIO, true);

    expect(formulario().form.disabled).toBe(true);
    expect(raiz().querySelector('#usuario-sucursal')?.getAttribute('aria-disabled')).toBe('true');
    expect(raiz().querySelector('#usuario-roles')?.getAttribute('aria-disabled')).toBe('true');
  });

  it('cada select proyectado toma su nombre de su etiqueta', async () => {
    await crear();

    for (const [id, etiqueta] of [
      ['usuario-sucursal', 'Sucursal'],
      ['usuario-roles', 'Roles'],
    ]) {
      const etiquetadoPor = raiz().querySelector(`#${id}`)?.getAttribute('aria-labelledby') ?? '';
      const textos = etiquetadoPor.split(' ').map((idEtiqueta) => document.getElementById(idEtiqueta)?.textContent?.trim());

      expect(textos, id).toContain(etiqueta);
    }
  });
});
