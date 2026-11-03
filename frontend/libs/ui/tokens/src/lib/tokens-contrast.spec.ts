import { describe, expect, it } from 'vitest';

import tokens from '../../tokens.json';

type Tema = 'light' | 'dark';

function luminancia(hex: string): number {
  const canales = [1, 3, 5].map((indice) => parseInt(hex.slice(indice, indice + 2), 16) / 255);
  const [r, g, b] = canales.map((canal) =>
    canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4,
  );

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(fondo: string, texto: string): number {
  const uno = luminancia(fondo);
  const dos = luminancia(texto);

  return (Math.max(uno, dos) + 0.05) / (Math.min(uno, dos) + 0.05);
}

const pares = [
  ['texto', 'fondo'],
  ['texto-suave', 'fondo'],
  ['primario-texto', 'primario'],
  ['peligro-texto', 'fondo'],
  ['exito-texto', 'fondo'],
  ['advertencia-texto', 'fondo'],
  ['info-texto', 'fondo'],
  ['texto', 'superficie'],
] as const;

describe('contraste de tokens semanticos', () => {
  for (const tema of ['light', 'dark'] as Tema[]) {
    for (const [texto, fondo] of pares) {
      it(`${tema}: ${texto}/${fondo} cumple 4.5:1`, () => {
        const colores = tokens.semantic[tema];
        const ratio = contraste(colores[fondo], colores[texto]);

        expect(ratio, `${texto}/${fondo} en ${tema}: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
