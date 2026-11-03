import { Linter } from 'eslint';
import { templateParser } from 'angular-eslint';
import { describe, expect, it } from 'vitest';

import { RULE_NAME, rule } from './no-inner-html.mjs';

const linter = new Linter();
const config = [
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: templateParser,
    },
    plugins: {
      nianva: {
        rules: {
          [RULE_NAME]: rule,
        },
      },
    },
    rules: {
      [`nianva/${RULE_NAME}`]: 'error',
    },
  },
];

function lint(codigo) {
  return linter.verify(codigo, config, { filename: 'plantilla.html' });
}

describe('no-inner-html', () => {
  it('permite interpolacion', () => {
    expect(lint('<p>{{ nombre }}</p>')).toEqual([]);
  });

  it('rechaza [innerHTML]', () => {
    expect(lint('<p [innerHTML]="texto"></p>')).toHaveLength(1);
  });

  it('rechaza innerHTML estatico', () => {
    expect(lint('<p innerHTML="texto"></p>')).toHaveLength(1);
  });

  it('rechaza [outerHTML]', () => {
    expect(lint('<p [outerHTML]="texto"></p>')).toHaveLength(1);
  });
});
