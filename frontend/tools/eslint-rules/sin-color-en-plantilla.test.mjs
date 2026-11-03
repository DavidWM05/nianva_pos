import { Linter } from 'eslint';
import { templateParser } from 'angular-eslint';
import { describe, expect, it } from 'vitest';

import { RULE_NAME, rule } from './sin-color-en-plantilla.mjs';

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

describe('sin-color-en-plantilla', () => {
  it('permite tokens, utilidades no cromaticas y valores especiales', () => {
    expect(lint('<p class="text-left text-sm bg-transparent"></p>')).toEqual([]);
    expect(lint('<p style="color: var(--nv-texto)"></p>')).toEqual([]);
    expect(lint('<p [style.color]="color"></p>')).toEqual([]);
    expect(lint('<p fill="currentColor" stroke="inherit"></p>')).toEqual([]);
  });

  it('rechaza colores literales en atributos y bindings', () => {
    expect(lint('<p style="color: red"></p>')).toHaveLength(1);
    expect(lint('<p style="color: #fff"></p>')).toHaveLength(1);
    expect(lint('<p fill="rgb(0,0,0)"></p>')).toHaveLength(1);
    expect(lint('<p [style.color]="\'red\'"></p>')).toHaveLength(1);
    expect(lint('<p [ngStyle]="{ color: \'blue\' }"></p>')).toHaveLength(1);
  });

  it('rechaza clases de color fijo', () => {
    expect(lint('<p class="bg-white text-red-500 border-gray-200"></p>')).toHaveLength(1);
    expect(lint('<p [class]="\'text-red\'"></p>')).toHaveLength(1);
    expect(lint('<p [class.text-red]="true"></p>')).toHaveLength(1);
  });
});
