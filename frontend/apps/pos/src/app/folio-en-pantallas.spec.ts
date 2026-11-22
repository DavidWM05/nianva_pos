import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * DAT-07 y F4-5: las pantallas muestran el folio del documento (y las extensiones, el de su
 * documento de origen), nunca el `numero` transitorio, que A5 retira de la API. Este spec busca
 * en las plantillas y componentes de apps/pos/src/app/modules cualquier lectura de `.numero`.
 */
const MODULOS = join(process.cwd(), 'apps', 'pos', 'src', 'app', 'modules');

// Solo baja.
const PENDIENTES: string[] = [];

function archivos(): string[] {
  return readdirSync(MODULOS, { recursive: true, encoding: 'utf8' })
    .filter((ruta) => (ruta.endsWith('.ts') || ruta.endsWith('.html')) && !ruta.endsWith('.spec.ts'))
    .map((ruta) => relative(MODULOS, join(MODULOS, ruta)).split(sep).join('/'))
    .sort();
}

const muestraNumero = (ruta: string) => /\.numero\b/.test(readFileSync(join(MODULOS, ruta), 'utf8'));

describe('Folio en las pantallas (DAT-07, F4-5)', () => {
  it('ningun archivo de modules fuera de PENDIENTES lee el numero transitorio', () => {
    expect(archivos().filter((ruta) => !PENDIENTES.includes(ruta) && muestraNumero(ruta))).toEqual([]);
  });

  it('PENDIENTES solo baja: cada archivo de la lista todavia lee el numero', () => {
    expect(PENDIENTES.filter((ruta) => !muestraNumero(ruta))).toEqual([]);
  });

  it('ningun archivo de modules lee los campos *_numero retirados', () => {
    const numeroRetirado = /(?:\.|\[\s*['"])\w+_numero\b/;
    expect(archivos().filter((ruta) => numeroRetirado.test(readFileSync(join(MODULOS, ruta), 'utf8')))).toEqual([]);
  });
});
