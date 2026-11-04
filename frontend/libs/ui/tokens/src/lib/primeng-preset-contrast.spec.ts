import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const preset = readFileSync(new URL('./primeng-preset.ts', import.meta.url), 'utf8');

describe('preset PrimeNG accesibilidad', () => {
  it('usa el primario 600 para que el texto blanco cumpla contraste', () => {
    expect(preset).toContain("color: '{primary.600}'");
  });
});
