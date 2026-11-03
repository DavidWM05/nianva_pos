import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configurarBaseApi, urlSesion } from '../core/api-config';
import { AuthService } from './auth.service';
import { SesionEntrePestanasService } from './sesion-entre-pestanas.service';

describe('AuthService logout', () => {
  let http: HttpTestingController;
  let sesion: { cerrarSesion: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    configurarBaseApi('http://x');
    sesion = { cerrarSesion: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SesionEntrePestanasService, useValue: sesion },
      ],
    });

    http = TestBed.inject(HttpTestingController);
  });

  it('avisa a las otras pestanas solo cuando el logout termina bien', () => {
    const auth = TestBed.inject(AuthService);
    auth.logout().subscribe();

    const peticion = http.expectOne(urlSesion('/logout'));
    expect(sesion.cerrarSesion).not.toHaveBeenCalled();

    peticion.flush({});
    expect(sesion.cerrarSesion).toHaveBeenCalledOnce();
    http.verify();
  });
});
