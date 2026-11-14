import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { EntidadConEstado, REGISTRO_ESTADOS, estadoVisual } from './registro-estados';

// Tabla de la migracion -> entidad del registro. Una tabla con columna
// `estado` que no esta aqui ni en SIN_REGISTRO hace fallar el test.
const TABLAS: Record<string, EntidadConEstado> = {
  ventas: 'venta',
  apartados: 'apartado',
  caja_sesiones: 'corte',
  cotizaciones: 'cotizacion',
  cuentas_cobrar: 'cuentaCobrar',
  cuentas_pagar: 'cuentaPagar',
  planes_pago_cliente_cuotas: 'cuota',
  gift_cards: 'giftCard',
  notas_credito: 'notaCredito',
  nominas: 'nomina',
  ordenes_produccion: 'ordenProduccion',
  pedidos: 'pedido',
  prestamos: 'prestamo',
};

// Estados que no se muestran como badge en pantallas de negocio.
const SIN_REGISTRO = new Set(['licencia_local']);

interface EnumDeEstado {
  valores: string[];
  porDefecto: string;
}

function enumsDelBackend(): Map<string, EnumDeEstado> {
  const modulos = join(process.cwd(), '..', 'backend', 'app', 'Modules');
  const enums = new Map<string, EnumDeEstado>();

  for (const modulo of readdirSync(modulos)) {
    const carpeta = join(modulos, modulo, 'Database', 'Migrations');
    let archivos: string[];

    try {
      archivos = readdirSync(carpeta);
    } catch {
      continue;
    }

    for (const archivo of archivos) {
      const php = readFileSync(join(carpeta, archivo), 'utf8');
      const tabla = /Schema::create\('(\w+)'/.exec(php)?.[1];
      const columna = /->enum\('estado',\s*\[([^\]]+)\]\)->default\('(\w+)'\)/.exec(php);

      if (tabla && columna) {
        const valores = [...columna[1].matchAll(/'(\w+)'/g)].map((valor) => valor[1]);
        enums.set(tabla, { valores, porDefecto: columna[2] });
      }
    }
  }

  return enums;
}

describe('REGISTRO_ESTADOS', () => {
  const enums = enumsDelBackend();

  it('encuentra los enums de estado del backend', () => {
    expect(enums.size).toBeGreaterThanOrEqual(Object.keys(TABLAS).length);
  });

  it('toda tabla con estado tiene entidad en el registro', () => {
    const sinEntidad = [...enums.keys()].filter((tabla) => !(tabla in TABLAS) && !SIN_REGISTRO.has(tabla));

    expect(sinEntidad).toEqual([]);
  });

  it('cada entidad tiene exactamente los valores del enum, y el valor por defecto no lleva badge', () => {
    for (const [tabla, entidad] of Object.entries(TABLAS)) {
      const columna = enums.get(tabla);

      expect(columna, `no se encontro el enum de ${tabla}`).toBeDefined();
      expect(Object.keys(REGISTRO_ESTADOS[entidad]).sort(), tabla).toEqual([...(columna?.valores ?? [])].sort());
      expect(estadoVisual(entidad, columna?.porDefecto ?? ''), `${tabla}.${columna?.porDefecto}`).toBeNull();
    }
  });

  it('accionAuditoria cubre exactamente el enum accion de audit_logs, todo con badge', () => {
    const migracion = readFileSync(
      join(process.cwd(), '..', 'backend', 'app', 'Modules', 'Auditoria', 'Database', 'Migrations', '2026_07_20_000001_create_auditoria_table.php'),
      'utf8',
    );
    const columna = /->enum\('accion',\s*\[([^\]]+)\]\)/.exec(migracion);
    const valores = [...(columna?.[1] ?? '').matchAll(/'(\w+)'/g)].map((valor) => valor[1]);
    const registro = (REGISTRO_ESTADOS as Record<string, Record<string, unknown>>)['accionAuditoria'];

    expect(valores).toEqual(['create', 'update', 'delete']);
    expect(Object.keys(registro ?? {}).sort()).toEqual([...valores].sort());

    for (const valor of valores) {
      expect(estadoVisual('accionAuditoria' as EntidadConEstado, valor), valor).not.toBeNull();
    }
  });
  it('licencia cubre exactamente el enum estado de licencia_local, y el valor por defecto no lleva badge', () => {
    const columna = enums.get('licencia_local');
    const registro = (REGISTRO_ESTADOS as Record<string, Record<string, unknown>>)['licencia'];

    expect(columna, 'no se encontro el enum de licencia_local').toBeDefined();
    expect(Object.keys(registro ?? {}).sort()).toEqual([...(columna?.valores ?? [])].sort());
    expect(estadoVisual('licencia' as EntidadConEstado, columna?.porDefecto ?? '')).toBeNull();
    expect(estadoVisual('licencia' as EntidadConEstado, 'vencida')?.tono).toBe('advertencia');
    expect(estadoVisual('licencia' as EntidadConEstado, 'revocada')?.tono).toBe('peligro');
    expect(estadoVisual('licencia' as EntidadConEstado, 'prueba')?.tono).toBe('info');
  });

  it('un estado desconocido se muestra tal cual en tono neutro', () => {
    expect(estadoVisual('venta', 'reembolsada')).toEqual({
      etiqueta: 'reembolsada',
      tono: 'neutro',
      icono: 'pi pi-circle',
    });
  });

  it('un estado conocido devuelve su entrada', () => {
    expect(estadoVisual('venta', 'anulada')?.tono).toBe('peligro');
  });
});
