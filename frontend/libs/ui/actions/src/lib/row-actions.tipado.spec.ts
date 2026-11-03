import { describe, expect, it } from 'vitest';

import { AccionFila } from './row-actions.component';

describe('tipado de AccionFila', () => {
  it('no permite texto visible en una accion', () => {
    // @ts-expect-error las acciones por fila no aceptan etiquetas visibles
    const accion: AccionFila = { tipo: 'ver', etiqueta: 'x' };

    expect(accion).toBeDefined();
  });
});
