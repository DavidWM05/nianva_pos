import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * DAT-08: los documentos y los clientes se identifican por el ulid que publica la API. En los
 * módulos que los muestran, ninguna pantalla convierte con Number() un parámetro de la ruta: con
 * un ulid da NaN y TypeScript no lo marca.
 */
const RAIZ = join(process.cwd(), 'apps', 'pos', 'src', 'app', 'modules');

/** Módulos cuyas entidades se resuelven por ulid (RutaPorUlid en el backend). */
const MODULOS_CON_ULID = [
  'apartados',
  'cotizaciones',
  'crm',
  'cuentas-cobrar',
  'cuentas-pagar',
  'devoluciones',
  'gift-cards',
  'notas-credito',
  'produccion',
  'tpv',
  'ventas-plazos',
];

/** Number(…paramMap.get(…)) o Number(…queryParamMap.get(…)), con o sin `snapshot`. */
const NUMBER_SOBRE_LA_RUTA = /Number\(\s*[^)]*?(?:queryParamMap|paramMap)\s*\.get\(/;

function archivosTs(modulo: string): string[] {
  const base = join(RAIZ, modulo);
  return readdirSync(base, { recursive: true, encoding: 'utf8' })
    .filter((ruta) => ruta.endsWith('.ts') && !ruta.endsWith('.spec.ts'))
    .map((ruta) => relative(RAIZ, join(base, ruta)).split(sep).join('/'))
    .sort();
}

describe('Ids de la ruta sin Number() en módulos con ulid (DAT-08)', () => {
  it('ninguna pantalla de esos módulos convierte el parámetro de la ruta con Number()', () => {
    const infractores = MODULOS_CON_ULID.flatMap(archivosTs).filter((ruta) =>
      NUMBER_SOBRE_LA_RUTA.test(readFileSync(join(RAIZ, ruta), 'utf8')),
    );

    expect(infractores).toEqual([]);
  });

  it('la regla reconoce las formas que se usaban antes de DAT-08', () => {
    expect(NUMBER_SOBRE_LA_RUTA.test("const id = Number(this.route.snapshot.paramMap.get('id'));")).toBe(true);
    expect(NUMBER_SOBRE_LA_RUTA.test("this.ventaIdBusqueda.set(Number(this.route.snapshot.queryParamMap.get('venta_id')));")).toBe(true);
    expect(NUMBER_SOBRE_LA_RUTA.test("const id = this.route.snapshot.paramMap.get('id') ?? '';")).toBe(false);
  });

  it('los módulos de la lista existen y tienen pantallas', () => {
    for (const modulo of MODULOS_CON_ULID) {
      expect(archivosTs(modulo).length, modulo).toBeGreaterThan(0);
    }
  });
});
