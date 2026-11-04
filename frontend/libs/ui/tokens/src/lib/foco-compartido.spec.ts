import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8');

// UI-17: el e2e del catalogo comprueba el foco visible; solo vale para pos si las dos apps
// cargan la misma regla.
describe('foco visible compartido (UI-17)', () => {
  it('foco.css define el contorno de :focus-visible con el token de foco', () => {
    expect(leer('../styles/foco.css')).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--nv-foco\)/);
  });

  it('pos y el catalogo cargan foco.css', () => {
    expect(leer('../../../../../apps/pos/project.json')).toContain('libs/ui/tokens/src/styles/foco.css');
    expect(leer('../../../../../apps/catalogo-ui/project.json')).toContain('libs/ui/tokens/src/styles/foco.css');
  });

  it('la hoja del catalogo no repite la regla de foco', () => {
    expect(leer('../styles/catalogo.css')).not.toContain(':focus-visible');
  });
});
