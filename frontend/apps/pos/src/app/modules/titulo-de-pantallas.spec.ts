import { Route } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { appRoutes } from '../app.routes';
import { REGISTRO_NAVEGACION_POS } from './modules.config';

interface RutaConTitulo {
  path: string;
  conComponente: boolean;
  conTitulo: boolean;
  redirige: boolean;
}

function aplanar(rutas: Route[], base = ''): RutaConTitulo[] {
  return rutas.flatMap((ruta) => {
    const path = [base, ruta.path ?? ''].filter((parte) => parte !== '').join('/');
    const redirige = typeof ruta.redirectTo === 'string'
      || Boolean(ruta.children?.some((hija) => hija.path === '' && typeof hija.redirectTo === 'string'));

    return [
      { path, conComponente: Boolean(ruta.loadComponent ?? ruta.component), conTitulo: Boolean(ruta.title), redirige },
      ...aplanar(ruta.children ?? [], path),
    ];
  });
}

const rutasDelShell = () => aplanar(appRoutes.find((ruta) => ruta.path === '' && ruta.children)?.children ?? []);

// TituloDesdeRegistro busca la entrada por la ruta configurada de la pantalla activa.
describe('titulo del navegador desde el registro (UI-08)', () => {
  it('cada entrada apunta directo a su pantalla, sin redireccion', () => {
    const rutas = rutasDelShell();
    const indirectas = REGISTRO_NAVEGACION_POS
      .filter((entrada) => !rutas.some((ruta) => ruta.path === entrada.ruta && ruta.conComponente && !ruta.redirige))
      .map((entrada) => entrada.ruta);

    expect(indirectas).toEqual([]);
  });

  it('una pantalla del registro no declara su propio title', () => {
    const delRegistro = new Set(REGISTRO_NAVEGACION_POS.map((entrada) => entrada.ruta));
    const conTitulo = rutasDelShell()
      .filter((ruta) => delRegistro.has(ruta.path) && ruta.conTitulo)
      .map((ruta) => ruta.path);

    expect(conTitulo).toEqual([]);
  });
});
