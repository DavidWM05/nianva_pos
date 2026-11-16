import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { contenidoEquivalente, generarLimites, limitesDelContrato } from './generar.mjs';

const raiz = process.cwd();
const spec = () => JSON.parse(readFileSync(join(raiz, '../docs/api/openapi.json'), 'utf8'));

describe('generar.mjs: mapa de límites (UI-11b)', () => {
  it('los límites versionados están al día con docs/api/openapi.json', () => {
    const enDisco = readFileSync(join(raiz, 'libs/api-contrato/src/lib/limites.ts'), 'utf8');

    expect(contenidoEquivalente(enDisco, generarLimites(spec()))).toBe(true);
  });

  it('toma maxLength, minimum, maximum, requerido y los decimales de multipleOf', () => {
    const limites = limitesDelContrato(spec());

    expect(limites['/categorias'].post.nombre).toEqual({ requerido: true, maxLength: 120 });
    expect(limites['/categorias'].post.descripcion).toEqual({ requerido: false });
    expect(limites['/reglas-precio'].post.porcentaje).toEqual({ requerido: false, minimum: 0, maximum: 100, decimales: 4 });
    expect(limites['/reglas-precio'].post.monto).toEqual({ requerido: false, minimum: 0, decimales: 2 });
    expect(limites['/reglas-precio'].post.cantidad_compra).toMatchObject({ decimales: 3 });
  });

  it('deduce los decimales de un pattern D2/D3/D4 cuando el campo viaja como cadena', () => {
    const cambiada = spec();
    cambiada.components.schemas.GuardarCategoriaRequest.properties.importe = {
      type: 'string',
      pattern: '^-?[0-9]+\\.[0-9]{2}$',
    };

    expect(limitesDelContrato(cambiada)['/categorias'].post.importe).toEqual({ requerido: false, decimales: 2 });
  });

  it('un cambio de límite en el contrato cambia el mapa y --check lo detecta', () => {
    const original = generarLimites(spec());
    const cambiada = spec();
    cambiada.components.schemas.GuardarCategoriaRequest.properties.nombre.maxLength = 80;

    expect(contenidoEquivalente(original, generarLimites(cambiada))).toBe(false);
  });

  it('solo incluye operaciones con cuerpo JSON', () => {
    const limites = limitesDelContrato(spec());

    expect(limites['/user']).toBeUndefined();
    expect(Object.keys(limites['/categorias'])).toEqual(['post']);
  });
});
