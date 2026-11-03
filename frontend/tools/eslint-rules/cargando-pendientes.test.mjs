import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Linter } from 'eslint';
import { templateParser } from 'angular-eslint';
import { describe, expect, it } from 'vitest';

import { RULE_NAME, rule } from './sin-texto-cargando.mjs';

const raiz = process.cwd();
const linter = new Linter();
const config = [
  {
    files: ['**/*.html'],
    languageOptions: { parser: templateParser },
    plugins: { nianva: { rules: { [RULE_NAME]: rule } } },
    rules: { [`nianva/${RULE_NAME}`]: 'error' },
  },
];
const pendientes = JSON.parse(readFileSync(join(raiz, 'tools/eslint-rules/cargando-pendientes.json'), 'utf8'));

describe('cargando-pendientes', () => {
  it('solo contiene archivos que aun violan la regla', () => {
    for (const ruta of pendientes) {
      const contenido = readFileSync(join(raiz, ruta), 'utf8');
      const errores = linter.verify(contenido, config, { filename: ruta });

      expect(errores.length, `${ruta} ya no tiene violaciones; quitar de cargando-pendientes.json`).toBeGreaterThan(0);
    }
  });

  it('esta ordenada', () => {
    expect([...pendientes].sort()).toEqual(pendientes);
  });
});
