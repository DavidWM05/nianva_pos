import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import tokens from '../../tokens.json';

describe('tokens primitivos para stylelint', () => {
  it('mantiene la familia mono exacta y la sombra de tarjeta exacta', () => {
    expect(tokens.primitive.typography.fontFamilyMono).toBe('monospace');
    expect(tokens.primitive.shadow.tarjeta).toBe('0 1px 3px rgb(0 0 0 / 10%)');
  });

  it('emite ambos primitivos en el CSS generado', () => {
    const css = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');

    expect(css).toContain('--nv-font-family-mono: monospace;');
    expect(css).toContain('--nv-shadow-tarjeta: 0 1px 3px rgb(0 0 0 / 10%);');
  });
});
