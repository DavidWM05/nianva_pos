import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { SesionActualService } from '../../auth/sesion-actual.service';
import { Sesion } from '../../auth/sesion.types';
import { NUCLEO_NAV_GROUPS } from '../../modules/modules.config';
import { SidebarComponent } from './sidebar.component';

function sesion(permisos: string[], modulos: string[]): Sesion {
  return {
    usuario: { id: 1, nombre: 'Ana', apellido: null, correo: 'a@x.test', tenant_id: 1, sucursal_id: 1, es_superadmin: false, roles: [], requiere_dos_factor: false, dos_factor_confirmado: false },
    sucursal: null,
    terminal: null,
    permisos,
    modulos_activos: modulos,
    regional: { locale: 'es-MX', moneda: '$', zona_horaria: 'America/Mexico_City' },
    perfil_giro: null,
  };
}

// El menu solo oculta: la autoridad sigue siendo el backend (permiso: y modulo:).
describe('SidebarComponent con la sesion (API-09)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SidebarComponent], providers: [provideRouter([])] });
  });

  function crear() {
    const fixture = TestBed.createComponent(SidebarComponent);
    for (const grupo of NUCLEO_NAV_GROUPS) {
      fixture.componentInstance.toggleGroup(grupo.key);
    }
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  const enlaces = (el: HTMLElement) => [...el.querySelectorAll('.sidebar__link')].map((a) => a.textContent?.trim());

  it('sin sesion cargada muestra todas las entradas', () => {
    const el = crear();

    expect(enlaces(el)).toContain('Usuarios');
    expect(enlaces(el)).toContain('Cotizaciones');
  });

  it('oculta las entradas sin permiso y las de modulos apagados', () => {
    TestBed.inject(SesionActualService).establecer(sesion(['ventas.ver', 'cotizaciones.ver'], []));
    const el = crear();

    expect(enlaces(el)).toContain('Ventas');
    expect(enlaces(el)).not.toContain('Usuarios');
    expect(enlaces(el)).not.toContain('Cotizaciones');
    expect(enlaces(el)).toContain('Inicio');
    expect(enlaces(el)).toContain('Preferencias');
  });

  it('muestra la entrada cuando tiene el permiso y su modulo esta activo', () => {
    TestBed.inject(SesionActualService).establecer(sesion(['cotizaciones.ver'], ['cotizaciones']));

    expect(enlaces(crear())).toContain('Cotizaciones');
  });

  it('oculta un grupo que se queda sin entradas', () => {
    TestBed.inject(SesionActualService).establecer(sesion([], []));
    const texto = crear().textContent ?? '';

    expect(texto).not.toContain('Producción');
    expect(texto).not.toContain('Nómina');
    expect(texto).toContain('Configuración');
  });
});
