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

/**
 * Todo usuario de un tenant tiene al menos un rol (decision del responsable; el backend
 * responde 422 en `roles` si llega vacio).
 */
const MENSAJE = 'Asigna al menos un rol al usuario.';

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
  sucursal: null,
  roles: [{ id: 1, nombre: 'vendedor' }],
};

describe('UsuarioFormComponent: al menos un rol', () => {
  let fixture: ComponentFixture<UsuarioFormComponent>;
  let emitidos: UsuarioFormPayload[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuarioFormComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: SucursalService, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
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

  async function crear(valorInicial: UsuarioAdmin | null = null): Promise<void> {
    fixture = TestBed.createComponent(UsuarioFormComponent);
    fixture.componentRef.setInput('valorInicial', valorInicial);
    emitidos = [];
    fixture.componentInstance.guardar.subscribe((payload) => emitidos.push(payload));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const raiz = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const formulario = (): DynamicFormComponent => fixture.debugElement.query(By.directive(DynamicFormComponent)).componentInstance;
  const select = (): HTMLElement | null => raiz().querySelector('#usuario-roles');
  const errorRoles = (): HTMLElement | null => raiz().querySelector('#usuario-roles-error');

  async function enviar(): Promise<void> {
    raiz().querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function elegir(opcion: string): Promise<void> {
    select()?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((o) => o.textContent?.trim() === opcion)?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('Roles se marca como obligatorio', async () => {
    await crear();

    expect(select()?.getAttribute('aria-required')).toBe('true');
    expect(raiz().querySelector('label[for="usuario-roles"] .dynamic-form__required')?.textContent?.trim()).toBe('*');
  });

  it('al crear sin rol no se envia y el campo muestra por que', async () => {
    await crear();
    formulario().form.patchValue({ nombre: 'Ana', correo: 'ana@test.com', password: 'password-valida-123' });

    await enviar();

    expect(emitidos).toHaveLength(0);
    expect(errorRoles()?.textContent?.trim()).toBe(MENSAJE);
    expect(errorRoles()?.getAttribute('role')).toBe('alert');
    expect(select()?.getAttribute('aria-describedby')).toContain('usuario-roles-error');
  });

  it('al crear con un rol se envia con ese rol', async () => {
    await crear();
    formulario().form.patchValue({ nombre: 'Ana', correo: 'ana@test.com', password: 'password-valida-123' });

    await elegir('Cajero');
    await enviar();

    expect(emitidos).toHaveLength(1);
    expect(emitidos[0]).toMatchObject({ roles: [3] });
    expect(errorRoles()).toBeNull();
  });

  it('el 422 de roles del backend se muestra en el campo y se quita al cambiar la seleccion', async () => {
    await crear(USUARIO);

    fixture.componentInstance.setServerErrors({ roles: [MENSAJE] });
    fixture.detectChanges();

    expect(errorRoles()?.textContent?.trim()).toBe(MENSAJE);

    await elegir('Cajero');

    expect(errorRoles()).toBeNull();
  });
});
