import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import tokens from '../../tokens.json';

type Tema = 'light' | 'dark';

const scss = readFileSync(new URL('../styles/material.scss', import.meta.url), 'utf8');
const semanticos = tokens.semantic as Record<Tema, Record<string, string>>;

function tokenDe(rol: string): string {
  const coincidencia = new RegExp(`--mat-sys-${rol}: var\\(--nv-([a-z-]+)\\);`).exec(scss);

  return coincidencia?.[1] ?? '';
}

function luminancia(hex: string): number {
  const canal = (inicio: number) => {
    const valor = parseInt(hex.slice(inicio, inicio + 2), 16) / 255;

    return valor <= 0.03928 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

// En M3, scrim, shadow y neutral10 son casi negros en los dos temas. Si apuntan al color de
// texto, en oscuro las sombras y el velo de los dialogos salen claros.
describe('tema de Material: sombras y velo', () => {
  it.each(['scrim', 'shadow', 'neutral10'])('%s es casi negro en claro y en oscuro', (rol) => {
    const token = tokenDe(rol);

    for (const tema of ['light', 'dark'] as Tema[]) {
      const color = semanticos[tema][token];

      expect(color, `${rol} -> --nv-${token} en ${tema}`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(luminancia(color), `${rol} -> --nv-${token} (${color}) en ${tema}`).toBeLessThan(0.02);
    }
  });

  // 49d: Material solo usa neutral-variant20 para el velo del drawer. Con texto-suave, en oscuro
  // salia gris claro.
  it('neutral-variant20 (velo del drawer) es casi negro en claro y en oscuro', () => {
    const token = tokenDe('neutral-variant20');

    for (const tema of ['light', 'dark'] as Tema[]) {
      const color = semanticos[tema][token];

      expect(color, `neutral-variant20 -> --nv-${token} en ${tema}`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(luminancia(color), `neutral-variant20 -> --nv-${token} (${color}) en ${tema}`).toBeLessThan(0.02);
    }
  });
});
