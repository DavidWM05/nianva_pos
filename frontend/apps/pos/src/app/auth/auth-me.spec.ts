import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { urlApi } from '../core/api-config';
import { AuthService } from './auth.service';

describe('AuthService.me con el contrato de GET /user (API-08)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('devuelve el usuario que viene dentro de data, como dice UsuarioResource', async () => {
    const usuario = {
      id: 7,
      nombre: 'Ana',
      apellido: null,
      correo: 'ana@x.test',
      tenant_id: 1,
      sucursal_id: 2,
      es_superadmin: false,
      roles: ['vendedor'],
      requiere_dos_factor: false,
      dos_factor_confirmado: false,
    };
    const respuesta = firstValueFrom(TestBed.inject(AuthService).me());

    TestBed.inject(HttpTestingController).expectOne(urlApi('/user')).flush({ data: usuario });

    expect(await respuesta).toEqual(usuario);
  });
});
