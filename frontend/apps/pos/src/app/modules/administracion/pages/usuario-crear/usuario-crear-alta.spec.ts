import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { proveedoresDePantalla } from '../../../../testing/proveedores-pantalla';
import { RolService, SucursalService, UsuarioAdminService } from '@nianva/domain-administracion';
import { UsuarioCrearComponent } from './usuario-crear.component';

// API-08b: la pagina de alta solo llama al servicio con un cuerpo de alta (esAltaUsuario).
describe('UsuarioCrearComponent cuerpo de alta', () => {
  async function crear() {
    const usuarioService = { crear: vi.fn().mockReturnValue(of({ id: 6, nombre: 'Ana' })) };

    await TestBed.configureTestingModule({
      imports: [UsuarioCrearComponent],
      providers: [
        ...proveedoresDePantalla(),
        { provide: UsuarioAdminService, useValue: usuarioService },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: SucursalService, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: RolService, useValue: { listarTodos: vi.fn().mockReturnValue(of([])) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(UsuarioCrearComponent);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    return { fixture, usuarioService };
  }

  it('sin password no llama al servicio', async () => {
    const { fixture, usuarioService } = await crear();

    fixture.componentInstance.onGuardar({ nombre: 'Ana', correo: 'ana@test.com', roles: [3] });

    expect(usuarioService.crear).not.toHaveBeenCalled();
  });

  it('con password y roles crea el usuario con ese cuerpo', async () => {
    const { fixture, usuarioService } = await crear();
    const alta = { nombre: 'Ana', correo: 'ana@test.com', password: 'password-valida-123', roles: [3] };

    fixture.componentInstance.onGuardar(alta);

    expect(usuarioService.crear).toHaveBeenCalledWith(alta);
  });
});
