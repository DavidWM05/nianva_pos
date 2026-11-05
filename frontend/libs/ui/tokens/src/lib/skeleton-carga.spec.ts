import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import tokens from '../../tokens.json';

type Tema = 'light' | 'dark';

const semanticos = tokens.semantic as Record<Tema, Record<string, string>>;
const scssSkeleton = readFileSync(
  new URL('../../../feedback/src/lib/skeleton/skeleton.component.scss', import.meta.url),
  'utf8',
);

function luminancia(hex: string): number {
  const canal = (inicio: number) => {
    const valor = parseInt(hex.slice(inicio, inicio + 2), 16) / 255;

    return valor <= 0.03928 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);

  return (claro + 0.05) / (oscuro + 0.05);
}

// UI-18: el skeleton tiene que verse sobre la pagina y dentro de una tarjeta. En el 49b paso a
// --nv-fondo-elevado, que en claro es blanco: sobre una tarjeta blanca desaparecia.
describe('skeleton: color de carga visible', () => {
  it('ui-skeleton pinta sus barras con el token --nv-carga', () => {
    expect(scssSkeleton).toMatch(/\.ui-skeleton__barra\s*\{[^}]*background:\s*var\(--nv-carga\)/);
  });

  it.each(['light', 'dark'] as Tema[])('en %s, carga se distingue del fondo y de la superficie', (tema) => {
    const carga = semanticos[tema]['carga'];

    expect(carga, `--nv-carga en ${tema}`).toMatch(/^#[0-9a-f]{6}$/i);

    for (const sobre of ['fondo', 'superficie']) {
      expect(contraste(carga, semanticos[tema][sobre]), `carga sobre ${sobre} en ${tema}`).toBeGreaterThanOrEqual(1.3);
    }
  });
});
