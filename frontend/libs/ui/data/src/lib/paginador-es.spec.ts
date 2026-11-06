import { describe, expect, it } from 'vitest';

import { PaginadorEs } from './paginador-es';

describe('PaginadorEs', () => {
  const paginador = new PaginadorEs();

  it('traduce las etiquetas del paginador al español', () => {
    expect(paginador.itemsPerPageLabel).toBe('Filas por página');
    expect(paginador.firstPageLabel).toBe('Primera página');
    expect(paginador.previousPageLabel).toBe('Página anterior');
    expect(paginador.nextPageLabel).toBe('Página siguiente');
    expect(paginador.lastPageLabel).toBe('Última página');
  });

  it('usa el rango 1–2 de 3 y el rango vacio', () => {
    expect(paginador.getRangeLabel(0, 2, 3)).toBe('1–2 de 3');
    expect(paginador.getRangeLabel(0, 25, 0)).toBe('0 de 0');
  });
});
