import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DynamicFormComponent } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { RolService } from '../rol.service';
import { SucursalService } from '../sucursal.service';
import { UsuarioFormPayload, esAltaUsuario } from '../usuario-admin.service';
import { UsuarioAdmin } from '../usuario.types';
import { UsuarioFormComponent } from './usuario-form.component';

// API-08b: en alta el formulario emite un cuerpo de alta (password y roles); en edicion la
// password en blanco no se exige y el cuerpo no es de alta.
describe('UsuarioFormComponent cuerpos de alta y edicion', () => {
  const usuario: UsuarioAdmin = {
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

  async function crear(valorInicial: UsuarioAdmin | null) {
    await TestBed.configureTestingModule({
      imports: [UsuarioFormComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: SucursalService, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: RolService, useValue: { listarTodos: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'vendedor', descripcion: null, es_sistema: true }])) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UsuarioFormComponent);
    fixture.componentRef.setInput('valorInicial', valorInicial);
    const emitidos: UsuarioFormPayload[] = [];
    fixture.componentInstance.guardar.subscribe((payload) => emitidos.push(payload));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const formulario: DynamicFormComponent = fixture.debugElement.query(By.directive(DynamicFormComponent)).componentInstance;

    return { fixture, formulario, emitidos };
  }

  it('en alta, el cuerpo emitido es de alta: password y roles', async () => {
    const { fixture, formulario, emitidos } = await crear(null);
    formulario.form.patchValue({ nombre: 'Ana', correo: 'ana@test.com', password: 'password-valida-123' });
    fixture.componentInstance['rolesControl'].setValue([1]);

    formulario.onSubmit();

    expect(emitidos).toHaveLength(1);
    expect(esAltaUsuario(emitidos[0])).toBe(true);
    expect(emitidos[0]).toMatchObject({ password: 'password-valida-123', roles: [1] });
  });

  it('en alta, sin password no se emite', async () => {
    const { fixture, formulario, emitidos } = await crear(null);
    formulario.form.patchValue({ nombre: 'Ana', correo: 'ana@test.com' });
    fixture.componentInstance['rolesControl'].setValue([1]);

    formulario.onSubmit();

    expect(emitidos).toHaveLength(0);
  });

  it('en edicion, la password en blanco no se exige y el cuerpo no es de alta', async () => {
    const { formulario, emitidos } = await crear(usuario);

    formulario.onSubmit();

    expect(emitidos).toHaveLength(1);
    expect(esAltaUsuario(emitidos[0])).toBe(false);
    expect(emitidos[0]).toMatchObject({ nombre: 'Carlos', correo: 'carlos@test.com', roles: [1] });
  });
});
