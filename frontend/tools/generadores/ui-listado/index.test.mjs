import { createRequire } from 'node:module';
import { Linter } from 'eslint';
import { templateParser } from 'angular-eslint';
import { describe, expect, it } from 'vitest';

import * as formatoPorPipe from '../../eslint-rules/formato-por-pipe.mjs';
import * as sinColor from '../../eslint-rules/sin-color-en-plantilla.mjs';
import * as sinCargando from '../../eslint-rules/sin-texto-cargando.mjs';

const generar = createRequire(import.meta.url)('./index.cjs');

const opciones = {
  entidad: 'nota-credito',
  plural: 'notas-credito',
  modulo: 'notas-credito',
  clave: 'notas-credito',
  endpoint: '/notas-credito',
  genero: 'f',
};

function arbol(existentes = []) {
  const archivos = new Map(existentes.map((ruta) => [ruta, 'ya estaba']));

  return {
    archivos,
    exists: (ruta) => archivos.has(ruta),
    write: (ruta, contenido) => archivos.set(ruta, contenido),
  };
}

const raiz = 'apps/pos/src/app/modules/notas-credito';
const componente = `${raiz}/pages/notas-credito-listado/notas-credito-listado.component`;

describe('generador ui-listado', () => {
  it('crea el componente, su plantilla y su spec, el servicio y los tipos', async () => {
    const tree = arbol();
    await generar(tree, opciones);

    expect([...tree.archivos.keys()].sort()).toEqual([
      `${raiz}/nota-credito-listado.service.ts`,
      `${raiz}/nota-credito.types.ts`,
      `${componente}.html`,
      `${componente}.spec.ts`,
      `${componente}.ts`,
    ]);
  });

  it('la plantilla sigue la composicion de UI-09', async () => {
    const tree = arbol();
    await generar(tree, opciones);
    const html = tree.archivos.get(`${componente}.html`);

    expect(html).toContain('<ui-page-header clave="notas-credito">');
    expect(html).toContain('<ui-btn-crear acciones objeto="nota credito" genero="f"');
    expect(html.indexOf('<ui-filter-bar')).toBeLessThan(html.indexOf('<ui-tabla'));
    expect(html).toContain('(reintentar)="cargar()"');
    expect(html).not.toMatch(/\(click\)|\(rowClick\)|onRowSelect/);
  });

  it('nombra las clases a partir del kebab-case', async () => {
    const tree = arbol();
    await generar(tree, opciones);

    expect(tree.archivos.get(`${componente}.ts`)).toContain('export class NotasCreditoListadoComponent');
    expect(tree.archivos.get(`${raiz}/nota-credito-listado.service.ts`)).toContain(
      'export class NotaCreditoListadoService',
    );
    expect(tree.archivos.get(`${raiz}/nota-credito-listado.service.ts`)).toContain("urlApi('/notas-credito')");
  });

  it('la plantilla generada pasa las reglas de lint propias', async () => {
    const tree = arbol();
    await generar(tree, opciones);
    const reglas = { formatoPorPipe, sinColor, sinCargando };
    const linter = new Linter();
    const config = [
      {
        files: ['**/*.html'],
        languageOptions: { parser: templateParser },
        plugins: { nianva: { rules: Object.fromEntries(Object.values(reglas).map((r) => [r.RULE_NAME, r.rule])) } },
        rules: Object.fromEntries(Object.values(reglas).map((r) => [`nianva/${r.RULE_NAME}`, 'error'])),
      },
    ];

    expect(linter.verify(tree.archivos.get(`${componente}.html`), config, { filename: 'listado.html' })).toEqual([]);
  });

  it('no sobrescribe archivos que ya existen', async () => {
    const tree = arbol([`${raiz}/nota-credito.types.ts`]);

    await expect(generar(tree, opciones)).rejects.toThrow(/ya existen/);
    expect(tree.archivos.get(`${raiz}/nota-credito.types.ts`)).toBe('ya estaba');
    expect(tree.archivos.size).toBe(1);
  });

  it('rechaza opciones fuera de kebab-case o un endpoint sin barra', async () => {
    await expect(generar(arbol(), { ...opciones, entidad: 'NotaCredito' })).rejects.toThrow(/kebab-case/);
    await expect(generar(arbol(), { ...opciones, endpoint: 'notas' })).rejects.toThrow(/endpoint/);
  });
});
