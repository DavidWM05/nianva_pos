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

function contraste(a: string, b: string): number {
  const [clara, oscura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);

  return (clara + 0.05) / (oscura + 0.05);
}

// 49f: primary-container apuntaba a fondo-elevado, igual que la superficie del calendario, y
// el sombreado de los dias dentro de un rango no se veia. En M3 es un tono primario suave.
describe('tema de Material: primary-container', () => {
  it('se distingue de la superficie en claro y en oscuro', () => {
    const token = tokenDe('primary-container');

    for (const tema of ['light', 'dark'] as Tema[]) {
      const color = semanticos[tema][token];
      const superficie = semanticos[tema]['superficie'];

      expect(color, `primary-container -> --nv-${token} en ${tema}`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(contraste(color, superficie), `--nv-${token} (${color}) contra superficie (${superficie}) en ${tema}`).toBeGreaterThanOrEqual(1.3);
    }
  });

  it('el texto normal se lee sobre el en claro y en oscuro', () => {
    const token = tokenDe('primary-container');

    for (const tema of ['light', 'dark'] as Tema[]) {
      expect(contraste(semanticos[tema]['texto'], semanticos[tema][token]), `texto sobre --nv-${token} en ${tema}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
