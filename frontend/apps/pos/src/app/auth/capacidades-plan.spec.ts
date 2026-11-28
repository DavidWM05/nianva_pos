import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateChildFn, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { Sesion, SesionActualService } from '@nianva/domain-sesion';
import { ToastService } from '@nianva/ui-feedback';
import { assert, describe, expect, it, vi } from 'vitest';

import avanzado from '@nianva/domain-sesion/fixtures/avanzado.json';
import basico from '@nianva/domain-sesion/fixtures/basico.json';
import pro from '@nianva/domain-sesion/fixtures/pro.json';
import { appRoutes } from '../app.routes';
import { configurarBaseApi, urlApi } from '../core/api-config';
import { erroresInterceptor } from '../core/errores.interceptor';
import { NUCLEO_NAV_GROUPS } from '../modules/modules.config';
import { AuthStateService } from './auth-state.service';
import { SesionEntrePestanasService } from './sesion-entre-pestanas.service';

const MENU_BASICO = [
  'inventario', 'categorias', 'departamentos', 'atributos', 'unidades-medida', 'listas-precio',
  'tpv-venta', 'tpv-caja', 'tpv-ventas', 'devoluciones', 'reporte-ventas',
  'usuarios', 'roles', 'empresa', 'terminales', 'metodos-pago', 'auditoria', 'preferencias',
];
const MENU_AVANZADO = [
  'precios', 'crm', 'tpv-caja-remota', 'tpv-caja-consolidado', 'cotizaciones', 'cuentas-cobrar',
  'apartados', 'notas-credito', 'gift-cards', 'reporte-cuentas-cobrar',
];
const MENU_PRO = [
  'cuentas-pagar', 'ventas-plazos', 'insumos', 'recetas', 'ordenes-produccion',
  'transformaciones', 'reporte-cuentas-pagar',
];

describe('Capacidades por plan', () => {
  it.each([
    { fixture: basico.data, esperado: MENU_BASICO, terminales: 1 },
    { fixture: avanzado.data, esperado: [...MENU_BASICO, ...MENU_AVANZADO], terminales: 3 },
    { fixture: pro.data, esperado: [...MENU_BASICO, ...MENU_AVANZADO, ...MENU_PRO], terminales: 10 },
  ])('aplica las entradas y señales para $fixture.plan.nombre', ({ fixture, esperado, terminales }) => {
    const sesion = TestBed.inject(SesionActualService);
    sesion.establecer({ ...fixture, licencia: fixture.licencia as Sesion['licencia'] });
    const entradas = NUCLEO_NAV_GROUPS.flatMap((grupo) => grupo.items).filter((item) =>
      sesion.visible(item.permiso, item.modulo, item.concesion, item.admiteSesionCentral));

    expect(entradas.map((item) => item.key).sort()).toEqual([...esperado].sort());
    expect(sesion.licencia()).toEqual(fixture.licencia);
    expect(sesion.modoOperativo()).toBe('operativa');
    expect(sesion.soloLectura()).toBe(false);
    expect(sesion.limite('terminales')).toEqual({ ...fixture.limites.terminales, maximo: terminales });
    expect(sesion.limite('sucursales')).toEqual(fixture.limites.sucursales);
    sesion.establecer({
      ...fixture,
      licencia: { estado: 'revocada', modo_operativo: 'solo_lectura', motivo: 'revocada', gracia_hasta: null, soporte_hasta: null },
    });
    expect(sesion.soloLectura()).toBe(true);
  });

  it('distingue módulo desactivado, permiso ausente y sesión aún sin cargar', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const sesion = TestBed.inject(SesionActualService);
    const router = TestBed.inject(Router);
    const guard = appRoutes.find((ruta) => ruta.path === '')?.canActivateChild?.[0] as CanActivateChildFn | undefined;
    assert(guard);
    const entrar = (url: string) => TestBed.runInInjectionContext(() => guard(
      {} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot,
    ));

    expect(entrar('/cuentas-cobrar/42')).toBe(true);
    sesion.establecer({ ...avanzado.data, licencia: null, modulos_activos: [] });
    expect(router.serializeUrl(entrar('/cuentas-cobrar/42') as ReturnType<Router['parseUrl']>)).toContain('motivo=modulo');
    expect(entrar('/precios/listas/42')).toBe(true);
    sesion.establecer({ ...basico.data, licencia: null, permisos: [] });
    expect(entrar('/cuentas-cobrar/42')).toBe(true);
  });

  it('reconsulta en otra pestaña por storage sin propagar el aviso de regreso', () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    const refrescarCapacidades = vi.fn();
    try {
      TestBed.configureTestingModule({ providers: [
        provideRouter([]),
        { provide: AuthStateService, useValue: { refrescarCapacidades } },
      ] });
      const entrePestanas = TestBed.inject(SesionEntrePestanasService);
      entrePestanas.inicializar();
      const notificar = vi.spyOn(entrePestanas, 'notificarCapacidades');
      window.dispatchEvent(new StorageEvent('storage', { key: 'nianva-sesion', newValue: 'capacidades:1234' }));
      expect(refrescarCapacidades).toHaveBeenCalledTimes(1);
      expect(notificar).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('declara la concesión de las entradas controladas por módulos, incluso si el módulo aparece activo', () => {
    const sesion = TestBed.inject(SesionActualService);
    const item = NUCLEO_NAV_GROUPS.flatMap((grupo) => grupo.items).find((entrada) => entrada.key === 'cuentas-cobrar');
    assert(item);
    sesion.establecer({ ...basico.data, licencia: null, modulos_activos: ['cxc'] });

    expect(item.concesion).toBe('credito_clientes');
    expect(sesion.visible(item.permiso, item.modulo, item.concesion)).toBe(false);
  });

  it('redirige un enlace directo a un módulo no contratado antes de cargarlo', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(SesionActualService).establecer({ ...basico.data, licencia: null });
    const router = TestBed.inject(Router);
    const guard = appRoutes.find((ruta) => ruta.path === '')?.canActivateChild?.[0] as CanActivateChildFn | undefined;
    assert(guard);
    const resultado = TestBed.runInInjectionContext(() => guard(
      {} as ActivatedRouteSnapshot, { url: '/cuentas-cobrar/42' } as RouterStateSnapshot,
    ));
    expect(router.serializeUrl(resultado as ReturnType<Router['parseUrl']>)).toContain('/funcion-no-incluida');
  });

  it('reconsulta sesión una sola vez tras una ráfaga de errores de feature y actualiza el menú', () => {
    configurarBaseApi('http://x');
    TestBed.configureTestingModule({ providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([erroresInterceptor])),
      provideHttpClientTesting(),
      { provide: ToastService, useValue: { errorTecnico: vi.fn() } },
    ] });
    const http = TestBed.inject(HttpClient);
    const mock = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthStateService).setUsuario(pro.data.usuario);
    const sesion = TestBed.inject(SesionActualService);
    sesion.establecer({ ...pro.data, licencia: null });

    for (const path of ['/cuentas-pagar', '/produccion']) {
      http.get(urlApi(path)).subscribe({ error: () => undefined });
      mock.expectOne(urlApi(path)).flush({ error_code: 'feature_no_concedida', message: 'Plan actualizado' }, {
        status: 403, statusText: 'Forbidden',
      });
    }

    mock.expectOne(urlApi('/sesion')).flush({ data: { ...avanzado.data, licencia: null } });
    expect(sesion.concedida('cxp')).toBe(false);
    mock.verify();
  });
});
