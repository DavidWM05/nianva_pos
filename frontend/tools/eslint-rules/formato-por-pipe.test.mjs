import { Linter } from 'eslint';
import { templateParser } from 'angular-eslint';
import { describe, expect, it } from 'vitest';

import { RULE_NAME, rule } from './formato-por-pipe.mjs';

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

describe('formato-por-pipe', () => {
  it('permite campos formateados y texto normal', () => {
    expect(lint('<p>{{ x.total | dinero }}</p>')).toEqual([]);
    expect(lint("<p>{{ x.cantidad | cantidad:'pza' }}</p>")).toEqual([]);
    expect(lint('<p>{{ x.total | porcentaje }}</p>')).toEqual([]);
    expect(lint('<p>{{ nombre }}</p>')).toEqual([]);
  });

  it('rechaza campos sin pipe o con otro pipe', () => {
    expect(lint('<p>{{ x.total }}</p>')).toHaveLength(1);
    expect(lint('<p>{{ subtotal }}</p>')).toHaveLength(1);
    expect(lint('<p>{{ saldoTotal() }}</p>')).toHaveLength(1);
    expect(lint('<p>{{ detalle.precio_unitario }}</p>')).toHaveLength(1);
    expect(lint('<p>${{ x.total }}</p>')).toHaveLength(1);
    expect(lint('<p>{{ x.total | json }}</p>')).toHaveLength(1);
  });

  it('rechaza campos leídos con navegación segura, por clave o con aserción', () => {
    expect(lint('<p>{{ venta?.total }}</p>')).toHaveLength(1);
    expect(lint('<p>{{ obtenerTotal?.() }}</p>')).toHaveLength(1);
    expect(lint("<p>{{ fila['total'] }}</p>")).toHaveLength(1);
    expect(lint('<p>{{ x!.total }}</p>')).toHaveLength(1);
  });

  it('revisa cada interpolación por separado', () => {
    expect(lint("<p>{{ fecha | date }}</p><p>{{ nombre }}</p>")).toHaveLength(1);
    expect(lint('<p>{{ x.total | dinero }}</p><p>{{ nombre }}</p>')).toEqual([]);
  });

  it('acepta el pipe dentro de paréntesis', () => {
    expect(lint('<p>{{ (x.total | dinero) }}</p>')).toEqual([]);
  });

  it('rechaza los pipes de Angular', () => {
    expect(lint("<p>{{ fecha | date:'short' }}</p>")).toHaveLength(1);
    expect(lint('<p>{{ total | currency }}</p>')).toHaveLength(1);
    expect(lint('<p>{{ cantidad | number }}</p>')).toHaveLength(1);
  });
});
