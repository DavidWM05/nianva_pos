import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Serie 50d: el texto de cada variante de nucleo-status-badge debe tener al menos 4.5:1 de
// contraste sobre su fondo, con tokens --nv-* (axe lo marco en el visor de auditoria). Lee los
// colores del SCSS real y los resuelve con libs/ui/tokens/tokens.json, en claro y oscuro.
type Tema = 'light' | 'dark';

const SCSS = readFileSync(join(process.cwd(), 'libs/ui-shared/src/lib/status-badge/status-badge.component.scss'), 'utf8');
const TOKENS = JSON.parse(readFileSync(join(process.cwd(), 'libs/ui/tokens/tokens.json'), 'utf8')) as {
  semantic: Record<Tema, Record<string, string>>;
};
const VARIANTES = ['success', 'warning', 'danger', 'info', 'neutral'] as const;

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function luminancia([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map((canal) => {
    const c = canal / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contraste(a: [number, number, number], b: [number, number, number]): number {
  const [uno, dos] = [luminancia(a), luminancia(b)];

  return (Math.max(uno, dos) + 0.05) / (Math.min(uno, dos) + 0.05);
}

/** Valor de `var(--nv-x)` en el tema; falla si no es un token --nv-* semantico. */
function token(expresion: string, tema: Tema): [number, number, number] {
  const nombre = /^var\(--nv-([a-z-]+)\)$/.exec(expresion.trim())?.[1];
  const valor = nombre ? TOKENS.semantic[tema][nombre] : undefined;
  if (!valor) {
    throw new Error(`"${expresion}" no es un token --nv-* semantico de tokens.json`);
  }

  return rgb(valor);
}

/** `var(--nv-x)` o `color-mix(in srgb, var(--nv-a) P%, var(--nv-b))`, resuelto a RGB. */
function color(expresion: string, tema: Tema): [number, number, number] {
  const mezcla = /^color-mix\(in srgb,\s*(var\([^)]+\))\s+(\d+(?:\.\d+)?)%,\s*(var\([^)]+\))\)$/.exec(expresion.trim());
  if (!mezcla) {
    return token(expresion, tema);
  }

  const p = Number(mezcla[2]) / 100;
  const [a, b] = [token(mezcla[1], tema), token(mezcla[3], tema)];

  return a.map((canal, i) => Math.round(canal * p + b[i] * (1 - p))) as [number, number, number];
}

function declaracion(variante: string, propiedad: string): string {
  const bloque = new RegExp(`\\.badge--${variante}\\s*\\{([^}]*)\\}`).exec(SCSS)?.[1] ?? '';
  const valor = new RegExp(`(?:^|;|\\n)\\s*${propiedad}\\s*:\\s*([^;]+);`).exec(bloque)?.[1];
  if (!valor) {
    throw new Error(`.badge--${variante} no declara ${propiedad}`);
  }

  return valor;
}

describe('StatusBadgeComponent (contraste)', () => {
  it('solo usa tokens --nv-* (ninguno --nucleo-*)', () => {
    expect(SCSS.match(/--nucleo-[a-z0-9-]+/g) ?? []).toEqual([]);
  });

  for (const tema of ['light', 'dark'] as Tema[]) {
    for (const variante of VARIANTES) {
      it(`${tema}: .badge--${variante} tiene al menos 4.5:1 entre texto y fondo`, () => {
        const ratio = contraste(color(declaracion(variante, 'color'), tema), color(declaracion(variante, 'background'), tema));

        expect(ratio, `.badge--${variante} en ${tema}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
