import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { NUCLEO_ITEM_INICIO, NUCLEO_NAV_GROUPS } from './modules.config';

const backend = join(process.cwd(), '..', 'backend', 'app', 'Modules', 'Nucleo');

/** Permisos `modulo.accion` que siembra NucleoRolesPermisosSeeder (const PERMISOS). */
function permisosDelBackend(): Set<string> {
  const php = readFileSync(join(backend, 'Database', 'Seeders', 'NucleoRolesPermisosSeeder.php'), 'utf8');
  const bloque = /const PERMISOS = \[([\s\S]*?)\n {4}\];/.exec(php)?.[1] ?? '';
  const nombres = [...bloque.matchAll(/'(\w+)' => \[([^\]]*)\]/g)].flatMap(([, modulo, acciones]) =>
    [...acciones.matchAll(/'(\w+)'/g)].map(([, accion]) => `${modulo}.${accion}`),
  );

  return new Set(nombres);
}

/** Slugs de ModuloActivo::MODULOS_DEFAULT, los que acepta el middleware `modulo:`. */
function modulosDelBackend(): Set<string> {
  const php = readFileSync(join(backend, 'Http', 'Middleware', 'ModuloActivo.php'), 'utf8');
  const bloque = /MODULOS_DEFAULT = \[([\s\S]*?)\];/.exec(php)?.[1] ?? '';

  return new Set([...bloque.matchAll(/'(\w+)'/g)].map(([, slug]) => slug));
}

const entradas = [NUCLEO_ITEM_INICIO, ...NUCLEO_NAV_GROUPS.flatMap((grupo) => grupo.items)];

describe('permisos y modulos del menu (API-09)', () => {
  it('lee el seeder y el middleware del backend', () => {
    expect(permisosDelBackend().has('ventas.ver')).toBe(true);
    expect(modulosDelBackend().has('cxc')).toBe(true);
  });

  it('cada permiso declarado existe en el backend', () => {
    const permisos = permisosDelBackend();
    const inexistentes = entradas.filter((e) => e.permiso && !permisos.has(e.permiso)).map((e) => `${e.key}: ${e.permiso}`);

    expect(inexistentes).toEqual([]);
  });

  it('cada modulo declarado lo reconoce el middleware modulo:', () => {
    const modulos = modulosDelBackend();
    const inexistentes = entradas.filter((e) => e.modulo && !modulos.has(e.modulo)).map((e) => `${e.key}: ${e.modulo}`);

    expect(inexistentes).toEqual([]);
  });

  it('toda pantalla del menu declara su permiso, salvo Inicio y Preferencias', () => {
    const sinPermiso = entradas.filter((e) => !e.permiso).map((e) => e.key);

    expect(sinPermiso.sort()).toEqual(['nucleo', 'preferencias']);
  });
});
