import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import tokens from '../../tokens.json';

type Tema = 'light' | 'dark';

const scss = readFileSync(new URL('../styles/material.scss', import.meta.url), 'utf8');
const semanticos = tokens.semantic as Record<Tema, Record<string, string>>;
// Valor de M3 (--mat-sys-focus/pressed-state-layer-opacity) si material.scss no lo fija.
const OPACIDAD_M3 = 0.12;

function opacidad(variante: 'text' | 'outlined', estado: 'focus' | 'pressed'): number {
  const coincidencia = new RegExp(`--mat-button-${variante}-${estado}-state-layer-opacity: ([0-9.]+);`).exec(scss);

  return coincidencia ? Number(coincidencia[1]) : OPACIDAD_M3;
}

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((inicio) => parseInt(hex.slice(inicio, inicio + 2), 16)) as [number, number, number];
}

function luminancia([r, g, b]: [number, number, number]): number {
  const canal = (valor: number) => {
    const v = valor / 255;

    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function contraste(a: [number, number, number], b: [number, number, number]): number {
  const [clara, oscura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);

  return (clara + 0.05) / (oscura + 0.05);
}

// 50i: con el menu de usuario abierto, su boton de texto queda en estado de foco y la capa de
// estado (primario al 12%) bajaba el texto primario a 4.36:1 en claro (axe, color-contrast).
// Vale para todo boton de texto u outlined con foco o pulsado.
describe('tema de Material: capa de estado de los botones de texto y outlined', () => {
  for (const variante of ['text', 'outlined'] as const) {
    for (const estado of ['focus', 'pressed'] as const) {
      it(`${variante} en ${estado}: el texto primario se lee sobre la capa en claro y en oscuro`, () => {
        const op = opacidad(variante, estado);

        for (const tema of ['light', 'dark'] as Tema[]) {
          const primario = rgb(semanticos[tema]['primario']);
          const superficie = rgb(semanticos[tema]['superficie']);
          const capa = superficie.map((canal, i) => Math.round(canal + op * (primario[i] - canal))) as [number, number, number];

          expect(contraste(primario, capa), `${variante} ${estado} (${op}) en ${tema}`).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }

  // El ripple del clic es otra capa (`--mat-button-*-ripple-color`), con la opacidad de pulsado de
  // M3 (12%) si material.scss no la fija: axe la vio al correr justo despues de abrir el menu.
  for (const variante of ['text', 'outlined'] as const) {
    it(`${variante}: el ripple del clic deja leer el texto primario en claro y en oscuro`, () => {
      const coincidencia = new RegExp(
        `--mat-button-${variante}-ripple-color: color-mix\\(in srgb, var\\(--nv-primario\\) ([0-9.]+)%, transparent\\);`,
      ).exec(scss);
      const op = coincidencia ? Number(coincidencia[1]) / 100 : OPACIDAD_M3;

      for (const tema of ['light', 'dark'] as Tema[]) {
        const primario = rgb(semanticos[tema]['primario']);
        const superficie = rgb(semanticos[tema]['superficie']);
        const capa = superficie.map((canal, i) => Math.round(canal + op * (primario[i] - canal))) as [number, number, number];

        expect(contraste(primario, capa), `ripple ${variante} (${op}) en ${tema}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
