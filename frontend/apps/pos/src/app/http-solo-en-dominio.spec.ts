import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * ARQ-12b: las llamadas HTTP salen de los servicios de libs/domain/*, que reciben y devuelven
 * tipos del contrato. En apps/pos ningún archivo usa HttpClient fuera de PENDIENTES.
 */
const RAIZ = join(process.cwd(), 'apps', 'pos', 'src', 'app');

/**
 * Solo baja. Vacía desde ARQ-12c: los módulos de negocio, el shell (sesión, interceptor de CSRF,
 * auditoría por registro y perfil) y los congelados (delivery, payroll y préstamos) ya no usan
 * HttpClient en la app.
 */
const PENDIENTES: string[] = [];

function archivosTs(): string[] {
  return readdirSync(RAIZ, { recursive: true, encoding: 'utf8' })
    .filter((ruta) => ruta.endsWith('.ts') && !ruta.endsWith('.spec.ts'))
    .map((ruta) => relative(RAIZ, join(RAIZ, ruta)).split(sep).join('/'))
    .sort();
}

const usaHttpClient = (ruta: string) => /\bHttpClient\b/.test(readFileSync(join(RAIZ, ruta), 'utf8'));

describe('HTTP solo desde libs/domain/* (ARQ-12b)', () => {
  it('ningún archivo de apps/pos fuera de PENDIENTES usa HttpClient', () => {
    expect(archivosTs().filter((ruta) => !PENDIENTES.includes(ruta) && usaHttpClient(ruta))).toEqual([]);
  });

  it('PENDIENTES solo baja: cada archivo de la lista todavía usa HttpClient', () => {
    expect(PENDIENTES.filter((ruta) => !usaHttpClient(ruta))).toEqual([]);
  });

  it('los módulos de ARQ-12b ya no tienen servicios HTTP en la app', () => {
    const migrados = [
      'administracion',
      'auditoria',
      'cuentas-cobrar',
      'cuentas-pagar',
      'gift-cards',
      'notas-credito',
      'nucleo',
      'ventas-plazos',
    ];

    expect(archivosTs().filter((ruta) => migrados.some((m) => ruta.startsWith(`modules/${m}/`)) && usaHttpClient(ruta))).toEqual([]);
  });
});
