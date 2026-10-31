import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { UsuarioAdmin } from './usuario.types';
import { UsuarioAdminService } from './usuario-admin.service';
import { UsuarioBuscadorService } from './usuario-buscador.service';

describe('UsuarioBuscadorService', () => {
  const usuario: UsuarioAdmin = {
    id: 3,
    nombre: 'Carlos',
    apellido: null,
    alias: null,
    correo: 'carlos@test.com',
    telefono: null,
    activo: true,
    ultimo_login: null,
    dos_factor_confirmado: false,
    sucursal: null,
    roles: [],
  };

  function crearServicio(usuarioAdminService: Partial<UsuarioAdminService>): UsuarioBuscadorService {
    TestBed.configureTestingModule({
      providers: [{ provide: UsuarioAdminService, useValue: usuarioAdminService }],
    });

    return TestBed.inject(UsuarioBuscadorService);
  }

  it('buscar() adapta UsuarioAdminService.listar() al contrato BuscadorEntidad', async () => {
    const listar = vi.fn().mockReturnValue(of({ data: [usuario], total: 1, permisos: { crear: true, editar: true, eliminar: true } }));
    const servicio = crearServicio({ listar });

    const resultado = await servicio.buscar('Carlos').toPromise();

    expect(listar).toHaveBeenCalledWith(expect.objectContaining({ first: 0 }), 'Carlos');
    expect(resultado).toEqual([usuario]);
  });

  it('obtener() adapta UsuarioAdminService.obtener() al contrato BuscadorEntidad', async () => {
    const obtener = vi.fn().mockReturnValue(of({ usuario, permisos: { crear: true, editar: true, eliminar: true } }));
    const servicio = crearServicio({ obtener });

    const resultado = await servicio.obtener(3).toPromise();

    expect(obtener).toHaveBeenCalledWith(3);
    expect(resultado).toEqual(usuario);
  });
});
