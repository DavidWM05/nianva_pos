import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * ARQ-12b: las llamadas HTTP salen de los servicios de libs/domain/*, que reciben y devuelven
 * tipos del contrato. En apps/pos ningún archivo usa HttpClient fuera de PENDIENTES.
 */
const RAIZ = join(process.cwd(), 'apps', 'pos', 'src', 'app');

/**
 * Solo baja. Los módulos que cambia el tren de Codex o que están congelados pasan a domain/* en
 * ARQ-12c, después de integrar los dos trenes; el shell (sesión, interceptor de CSRF, auditoría
 * por registro y perfil) también queda para entonces.
 */
const PENDIENTES = [
  // Shell de la app.
  'auth/auth.service.ts',
  'auth/csrf-retry.interceptor.ts',
  'auth/sesion-actual.service.ts',
  'core/auditoria.service.ts',
  'perfil/seguridad.service.ts',
  // Congelados (ARQ-10): delivery, payroll y préstamos.
  'modules/delivery/pedido.service.ts',
  'modules/payroll/empleado.service.ts',
  'modules/payroll/nomina.service.ts',
  'modules/prestamos/prestamo.service.ts',
];

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
