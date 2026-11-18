import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { contenidoEquivalente, generarContrato, limitesDelContrato } from './generar.mjs';

const raiz = process.cwd();
const spec = () => JSON.parse(readFileSync(join(raiz, '../docs/api/openapi.json'), 'utf8'));

describe('generar.mjs (API-08)', () => {
  it('los tipos versionados estan al dia con docs/api/openapi.json', async () => {
    const enDisco = readFileSync(join(raiz, 'libs/api-contrato/src/lib/openapi.ts'), 'utf8');

    expect(contenidoEquivalente(enDisco, await generarContrato(spec()))).toBe(true);
  });

  it('un cambio en el contrato cambia los tipos y --check lo detecta', async () => {
    const original = await generarContrato(spec());
    const cambiada = spec();
    cambiada.components.schemas.GastoResource.properties.monto = { type: 'number' };

    const generado = await generarContrato(cambiada);

    expect(contenidoEquivalente(original, generado)).toBe(false);
    expect(generado).toMatch(/GastoResource: \{[^}]*monto: number;/);
  });

  it('exporta cada esquema con su propio nombre', async () => {
    const generado = await generarContrato(spec());

    expect(generado).toContain("export type SesionResource = components['schemas']['SesionResource'];");
  });

  it('ignora la diferencia de fin de linea de Windows', () => {
    expect(contenidoEquivalente('a\r\nb\r\n', 'a\nb\n')).toBe(true);
  });

  it('los campos de las lineas (items.*) tienen sus limites en un segundo nivel', () => {
    const venta = limitesDelContrato(spec())['/ventas'].post;

    expect(venta.items.requerido).toBe(true);
    expect(venta.items.elemento.cantidad).toEqual({ requerido: true, minimum: 0.001, maximum: 99999999999.999, decimales: 3 });
    expect(venta.items.elemento.presentacion_id.requerido).toBe(false);
    expect(venta.pagos.elemento.monto.requerido).toBe(true);
  });

  it('un campo que no es arreglo de objetos no tiene segundo nivel', () => {
    const venta = limitesDelContrato(spec())['/ventas'].post;

    expect(venta.lista_precio_id).not.toHaveProperty('elemento');
  });
});
