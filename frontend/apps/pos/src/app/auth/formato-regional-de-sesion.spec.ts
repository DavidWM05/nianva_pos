import { TestBed } from '@angular/core/testing';
import { FORMATO_REGIONAL, FORMATO_REGIONAL_DEFAULTS } from '@nianva/ui-format';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideFormatoRegionalDeSesion } from './formato-regional-de-sesion';
import { SesionActualService } from './sesion-actual.service';
import { Sesion } from './sesion.types';

const sesion: Sesion = {
  usuario: { id: 1, nombre: 'Ana', apellido: null, correo: 'ana@x.test', tenant_id: 1, sucursal_id: 1, es_superadmin: false, roles: [], requiere_dos_factor: false, dos_factor_confirmado: false },
  sucursal: null,
  terminal: null,
  permisos: [],
  modulos_activos: [],
  regional: { locale: 'es-US', moneda: 'USD', zona_horaria: 'America/Tijuana' },
  perfil_giro: null,
};

describe('FORMATO_REGIONAL desde GET /sesion (API-09)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFormatoRegionalDeSesion()] });
  });

  it('sin sesion usa los valores por defecto', () => {
    expect({ ...TestBed.inject(FORMATO_REGIONAL) }).toEqual(FORMATO_REGIONAL_DEFAULTS);
  });

  it('con sesion toma moneda, zona horaria y locale del tenant', () => {
    const formato = TestBed.inject(FORMATO_REGIONAL);
    TestBed.inject(SesionActualService).establecer(sesion);

    expect(formato.moneda).toBe('USD');
    expect(formato.zonaHoraria).toBe('America/Tijuana');
    expect(formato.locale).toBe('es-US');
  });
});
