import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { Sesion, SesionActualService } from '@nianva/domain-sesion';

function sesion(parcial: Partial<Sesion> = {}): Sesion {
  return {
    usuario: { id: 1, nombre: 'Ana', apellido: null, correo: 'ana@x.test', tenant_id: 1, sucursal_id: 1, es_superadmin: false, roles: ['vendedor'], requiere_dos_factor: false, dos_factor_confirmado: false },
    sucursal: { id: 1, nombre: 'Centro' },
    terminal: null,
    permisos: ['ventas.ver', 'inventario.ver'],
    modulos_activos: ['cotizaciones'],
    regional: { locale: 'es-MX', moneda: '$', zona_horaria: 'America/Mexico_City' },
    licencia: {
      estado: 'sin_licencia',
      modo_operativo: 'operativa',
      motivo: null,
      gracia_hasta: null,
      soporte_hasta: null,
    },
    perfil_giro: null,
    ...parcial,
  };
}

describe('SesionActualService', () => {
  it('sin sesion cargada todo es visible: el backend sigue protegiendo cada ruta', () => {
    const servicio = TestBed.inject(SesionActualService);

    expect(servicio.visible('usuarios.ver', 'cxc')).toBe(true);
  });

  it('con sesion, una entrada se ve solo si tiene su permiso y su modulo esta activo', () => {
    const servicio = TestBed.inject(SesionActualService);
    servicio.establecer(sesion());

    expect(servicio.visible('ventas.ver')).toBe(true);
    expect(servicio.visible('usuarios.ver')).toBe(false);
    expect(servicio.visible(undefined, 'cotizaciones')).toBe(true);
    expect(servicio.visible(undefined, 'cxc')).toBe(false);
    expect(servicio.visible('ventas.ver', 'cxc')).toBe(false);
    expect(servicio.visible()).toBe(true);
  });

  it('limpiar vuelve al estado sin sesion', () => {
    const servicio = TestBed.inject(SesionActualService);
    servicio.establecer(sesion());
    servicio.limpiar();

    expect(servicio.sesion()).toBeNull();
    expect(servicio.visible('usuarios.ver')).toBe(true);
  });
});
