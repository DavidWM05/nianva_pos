import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { EntidadConEstado, REGISTRO_ESTADOS } from './registro-estados';

// UI-06b: el registro se compara tambien con el contrato OpenAPI (docs/api/openapi.json), no
// solo con las migraciones. Cada entidad apunta al esquema que la API responde y a la propiedad
// que lleva su estado. Una entidad del registro sin fuente aqui hace fallar el test.
interface Esquema {
  type?: string | string[];
  enum?: string[];
  properties?: Record<string, Esquema>;
  items?: Esquema;
}

interface Contrato {
  paths: Record<string, Record<string, { responses: Record<string, { content?: Record<string, { schema: Esquema }> }> }>>;
  components: { schemas: Record<string, Esquema> };
}

const contrato: Contrato = JSON.parse(readFileSync(join(process.cwd(), '..', 'docs', 'api', 'openapi.json'), 'utf8'));

function deEsquema(nombre: string, propiedad = 'estado'): Esquema | undefined {
  return contrato.components.schemas[nombre]?.properties?.[propiedad];
}

function deRuta(ruta: string, propiedad: string): Esquema | undefined {
  const cuerpo = contrato.paths[ruta]?.['get']?.responses['200']?.content?.['application/json']?.schema;

  return cuerpo?.properties?.['data']?.items?.properties?.[propiedad];
}

const FUENTES: Record<EntidadConEstado, () => Esquema | undefined> = {
  venta: () => deEsquema('VentaResource'),
  apartado: () => deEsquema('ApartadoResource'),
  corte: () => deEsquema('CajaSesionResource'),
  cotizacion: () => deEsquema('CotizacionResource'),
  cuentaCobrar: () => deEsquema('CuentaCobrarResource'),
  cuentaPagar: () => deEsquema('CuentaPagarResource'),
  // La cuota no tiene Resource propio: PlanPagoResource publica cada cuota con campos explícitos.
  cuota: () => contrato.components.schemas['PlanPagoResource']?.properties?.['cuotas']?.items?.properties?.['estado'],
  giftCard: () => deEsquema('GiftCardResource'),
  notaCredito: () => deEsquema('NotaCreditoResource'),
  nomina: () => deEsquema('NominaResource'),
  ordenProduccion: () => deEsquema('OrdenProduccionResource'),
  pedido: () => deEsquema('PedidoResource'),
  // La auditoria no tiene Resource: el controlador arma la entrada en /auditoria.
  accionAuditoria: () => deRuta('/auditoria', 'accion'),
  prestamo: () => deEsquema('PrestamoResource'),
  licencia: () => deEsquema('LicenciaLocalResource'),
};

describe('REGISTRO_ESTADOS contra el contrato OpenAPI', () => {
  it('toda entidad del registro tiene su fuente en el contrato', () => {
    expect(Object.keys(FUENTES).sort()).toEqual(Object.keys(REGISTRO_ESTADOS).sort());
  });

  it.each(Object.keys(REGISTRO_ESTADOS) as EntidadConEstado[])('%s tiene exactamente los valores del enum del contrato', (entidad) => {
    const esquema = FUENTES[entidad]();

    expect(esquema, `${entidad}: el contrato no documenta la propiedad`).toBeDefined();
    expect(esquema?.enum, `${entidad}: el contrato no la documenta como enum`).toBeDefined();
    expect(Object.keys(REGISTRO_ESTADOS[entidad]).sort()).toEqual([...(esquema?.enum ?? [])].sort());
  });

  it('el navegador global de auditoria documenta el mismo enum de accion', () => {
    expect([...(deRuta('/auditoria/global', 'accion')?.enum ?? [])].sort()).toEqual(Object.keys(REGISTRO_ESTADOS.accionAuditoria).sort());
  });
});
