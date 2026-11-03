import { Route } from '@angular/router';
import { problemaDeNombre } from '@nianva/ui-layout';
import { describe, expect, it } from 'vitest';

import { appRoutes } from '../app.routes';
import { REGISTRO_NAVEGACION_POS } from './modules.config';

interface RutaPlana {
  path: string;
  conComponente: boolean;
  /** Ruta completa a la que redirige: la propia o la de su hija vacia (`{ path: '', redirectTo }`). */
  redirige?: string;
}

function unir(base: string, path: string): string {
  return [base, path].filter((parte) => parte !== '').join('/');
}

function aplanar(rutas: Route[], base = ''): RutaPlana[] {
  return rutas.flatMap((ruta) => {
    const path = unir(base, ruta.path ?? '');
    const vacia = ruta.children?.find((hija) => hija.path === '' && typeof hija.redirectTo === 'string');
    let redirige: string | undefined;

    if (typeof ruta.redirectTo === 'string') {
      redirige = unir(base, ruta.redirectTo);
    } else if (vacia) {
      redirige = unir(path, vacia.redirectTo as string);
    }

    const propia: RutaPlana = { path, conComponente: Boolean(ruta.loadComponent ?? ruta.component), redirige };

    return [propia, ...aplanar(ruta.children ?? [], path)];
  });
}

function rutasDelShell(): RutaPlana[] {
  return aplanar(appRoutes.find((ruta) => ruta.path === '' && ruta.children)?.children ?? []);
}

/** Una pantalla raiz: con componente, sin parametros y que no es alta ni edicion. */
function esPantallaRaiz(ruta: RutaPlana): boolean {
  return ruta.conComponente
    && ruta.path !== ''
    && !ruta.path.includes(':')
    && !/(^|\/)(nuevo|nueva|editar)$/.test(ruta.path);
}

// Pantallas raiz que no van en el menu, con su razon.
const SIN_ENTRADA: Record<string, string> = {
  'gift-cards/emitir': 'alta de gift card; se llega desde el listado (no sigue /nuevo, pendiente de la migracion)',
  'cotizaciones/crear': 'alta de cotizacion; se llega desde el listado (no sigue /nuevo, pendiente de la migracion)',
  'demo/vista-registro': 'demo de RecordTabsComponent para desarrollo, fuera del menu',
};

describe('registro de navegacion (UI-08)', () => {
  it('cada nombre tiene mayuscula solo al inicio y no empieza con "Gestion de"', () => {
    const problemas = REGISTRO_NAVEGACION_POS
      .map((entrada) => [entrada.nombre, problemaDeNombre(entrada.nombre)] as const)
      .filter(([, problema]) => problema !== null);

    expect(problemas).toEqual([]);
  });

  it('las claves y las rutas no se repiten', () => {
    const claves = REGISTRO_NAVEGACION_POS.map((entrada) => entrada.clave);
    const rutas = REGISTRO_NAVEGACION_POS.map((entrada) => entrada.ruta);

    expect(new Set(claves).size).toBe(claves.length);
    expect(new Set(rutas).size).toBe(rutas.length);
  });

  it('cada entrada lleva a una pantalla del shell con componente', () => {
    const rutas = rutasDelShell();
    const conComponente = new Set(rutas.filter((ruta) => ruta.conComponente).map((ruta) => ruta.path));
    const destino = (path: string) => rutas.find((ruta) => ruta.path === path)?.redirige ?? path;
    const sinPantalla = REGISTRO_NAVEGACION_POS
      .filter((entrada) => !conComponente.has(destino(entrada.ruta)))
      .map((entrada) => entrada.ruta);

    expect(sinPantalla).toEqual([]);
  });

  it('dos entradas no llevan a la misma pantalla con nombres distintos', () => {
    const rutas = rutasDelShell();
    const destino = (path: string) => rutas.find((ruta) => ruta.path === path)?.redirige ?? path;
    const porDestino = new Map<string, string[]>();

    for (const entrada of REGISTRO_NAVEGACION_POS) {
      const clave = destino(entrada.ruta);
      porDestino.set(clave, [...(porDestino.get(clave) ?? []), entrada.nombre]);
    }

    const repetidas = [...porDestino.entries()].filter(([, nombres]) => nombres.length > 1);

    expect(repetidas).toEqual([]);
  });

  it('toda pantalla raiz del shell tiene entrada en el registro o una razon para no tenerla', () => {
    const rutas = rutasDelShell();
    // Una entrada que apunta a un modulo cubre la pantalla a la que redirige.
    const registradas = new Set(
      REGISTRO_NAVEGACION_POS.flatMap((entrada) => {
        const redirige = rutas.find((ruta) => ruta.path === entrada.ruta)?.redirige;

        return redirige ? [entrada.ruta, redirige] : [entrada.ruta];
      }),
    );
    const sinEntrada = rutasDelShell()
      .filter(esPantallaRaiz)
      .map((ruta) => ruta.path)
      .filter((path) => !registradas.has(path) && !(path in SIN_ENTRADA));

    expect(sinEntrada).toEqual([]);
  });
});
