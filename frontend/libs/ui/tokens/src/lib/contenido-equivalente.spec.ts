import { describe, expect, it } from 'vitest';

import { contenidoEquivalente } from '../../scripts/contenido-equivalente.mjs';

describe('contenidoEquivalente', () => {
  it('trata LF y CRLF como el mismo contenido', () => {
    expect(contenidoEquivalente('uno\ndos\n', 'uno\r\ndos\r\n')).toBe(true);
  });

  it('detecta contenido distinto', () => {
    expect(contenidoEquivalente('uno\ndos\n', 'uno\ntres\n')).toBe(false);
  });
});
