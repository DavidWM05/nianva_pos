import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';

import { RULE_NAME, rule } from './respuesta-del-contrato.mjs';

const raiz = process.cwd();
const linter = new Linter();
const config = [
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { nianva: { rules: { [RULE_NAME]: rule } } },
    rules: { [`nianva/${RULE_NAME}`]: 'error' },
  },
];
const pendientes = JSON.parse(readFileSync(join(raiz, 'tools/eslint-rules/contrato-pendientes.json'), 'utf8'));

describe('contrato-pendientes', () => {
  it('solo contiene archivos que aun violan la regla', () => {
    for (const ruta of pendientes) {
      const contenido = readFileSync(join(raiz, ruta), 'utf8');
      const errores = linter.verify(contenido, config, { filename: ruta });

      expect(errores.length, `${ruta} ya no tiene violaciones; quitar de contrato-pendientes.json`).toBeGreaterThan(0);
    }
  });
});
