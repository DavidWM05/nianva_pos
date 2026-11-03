import { Linter } from 'eslint';
import { templateParser } from 'angular-eslint';
import { describe, expect, it } from 'vitest';

import { RULE_NAME, rule } from './sin-texto-cargando.mjs';

const linter = new Linter();
const config = [
  {
    files: ['**/*.html'],
    languageOptions: { parser: templateParser },
    plugins: { nianva: { rules: { [RULE_NAME]: rule } } },
    rules: { [`nianva/${RULE_NAME}`]: 'error' },
  },
];

function lint(codigo) {
  return linter.verify(codigo, config, { filename: 'plantilla.html' });
}

describe('sin-texto-cargando', () => {
  it('rechaza el texto de carga suelto', () => {
    expect(lint('<p>Cargando...</p>')).toHaveLength(1);
    expect(lint('<p>Cargando…</p>')).toHaveLength(1);
    expect(lint('<p>Generando código...</p>')).toHaveLength(1);
    expect(lint('<td>cargando ventas</td>')).toHaveLength(1);
  });

  it('rechaza el texto de carga junto a una interpolación', () => {
    expect(lint('<p>Cargando {{ modulo }}...</p>')).toHaveLength(1);
  });

  it('permite el skeleton y textos que no son de carga', () => {
    expect(lint('<ui-skeleton forma="texto" [lineas]="3" />')).toEqual([]);
    expect(lint('<p>Carga masiva de productos</p>')).toEqual([]);
    expect(lint('<p>{{ cargando() }}</p>')).toEqual([]);
    expect(lint('@if (cargando()) { <ui-skeleton /> }')).toEqual([]);
  });
});
