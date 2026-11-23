import { describe, expect, it } from 'vitest';

import { appRoutes } from '../../app.routes';
import { metricasReportes } from './metricas-reportes';

describe('Métricas declaradas por los reportes', () => {
  it('declara las métricas y el detalle de cada ruta de reportes', () => {
    const rutas = appRoutes.flatMap((ruta) => ruta.children ?? []);
    const reportes = rutas.find((ruta) => ruta.path === 'reportes')?.children ?? [];
    expect(reportes.map((ruta) => ruta.path).sort()).toEqual(Object.keys(metricasReportes).sort());
    for (const metricas of Object.values(metricasReportes)) {
      expect(metricas.length).toBeGreaterThan(1);
      expect(metricas).toContain('detalle');
      expect(new Set(metricas).size).toBe(metricas.length);
    }
  });
});
