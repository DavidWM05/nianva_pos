import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const generar = createRequire(import.meta.url)('./index.cjs');

const opciones = { nombre: 'reporte-demo', modulo: 'reportes', clave: 'demo', endpoint: '/ventas/reporte' };

describe('generador ui-reporte', () => {
  it('genera una pantalla tipada y declara el contrato de métricas', () => {
    const archivos = new Map();
    const despues = generar({
      exists: (ruta) => archivos.has(ruta),
      write: (ruta, texto) => archivos.set(ruta, texto),
    }, opciones);

    expect(archivos.size).toBe(2);
    expect([...archivos.values()].some((texto) => texto.includes('metricasReporteDemo') && texto.includes('/ventas/reporte'))).toBe(true);
    expect([...archivos.values()].some((texto) => texto.includes('<ui-report clave="demo"'))).toBe(true);
    expect(typeof despues).toBe('function');
  });

  it('rechaza rutas inválidas y nunca reemplaza archivos', () => {
    const tree = {
      exists: () => true,
      write: () => { throw new Error('no debe escribir'); },
    };

    expect(() => generar(tree, { ...opciones, endpoint: 'https://ejemplo.test' })).toThrow(/endpoint/);
    expect(() => generar(tree, opciones)).toThrow(/ya existe/);
  });
});
