import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * ARQ-07: el giro es configuración. Ninguna vista, mensaje ni código del frontend nombra un
 * giro ni un atributo propio de uno ("Talla", "Color", ropa, zapatería): los atributos y sus
 * valores llegan como datos del tenant. "color" en minúsculas es CSS o tema y no cuenta. Los
 * comentarios quedan fuera, igual que los tipos generados del contrato.
 */
const RAICES = [join(process.cwd(), 'apps', 'pos', 'src', 'app'), join(process.cwd(), 'libs')];
const PATRON = /\b(Talla|talla|Color|ropa|Ropa|zapater[ií]a|Zapater[ií]a)\b/;
const FUERA = ['libs/api-contrato/src/lib/'];

/** Solo baja: archivos que todavía tienen texto de giro. */
const PENDIENTES: string[] = [];

function archivos(): string[] {
  return RAICES.flatMap((raiz) =>
    readdirSync(raiz, { recursive: true, encoding: 'utf8' })
      .filter((ruta) => /\.(ts|html)$/.test(ruta) && !ruta.endsWith('.spec.ts') && !ruta.includes('node_modules'))
      .map((ruta) => relative(process.cwd(), join(raiz, ruta)).split(sep).join('/')),
  ).filter((ruta) => !FUERA.some((prefijo) => ruta.startsWith(prefijo)));
}

function sinComentarios(codigo: string): string {
  return codigo
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

function textoDeGiro(ruta: string): string[] {
  return sinComentarios(readFileSync(join(process.cwd(), ruta), 'utf8'))
    .split('\n')
    .filter((linea) => PATRON.test(linea))
    .map((linea) => `${ruta}: ${linea.trim()}`);
}

describe('Sin texto de giro en el frontend (ARQ-07)', () => {
  it('ninguna vista ni código fuera de PENDIENTES nombra un giro o sus atributos', () => {
    const hallazgos = archivos()
      .filter((ruta) => !PENDIENTES.includes(ruta))
      .flatMap(textoDeGiro);

    expect(hallazgos).toEqual([]);
  });

  it('cada pendiente existe y todavía tiene texto de giro', () => {
    for (const ruta of PENDIENTES) {
      expect(textoDeGiro(ruta), ruta).not.toEqual([]);
    }
  });
});
