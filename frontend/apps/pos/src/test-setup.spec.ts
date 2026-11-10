import { describe, expect, it } from 'vitest';

// Los specs de pos comparten window entre archivos. Un spec que reemplaza window.matchMedia
// (tema.service.spec.ts) no debe filtrar su stub al siguiente: el BreakpointObserver del CDK
// lo llama al montar Material y fallaba con "mql.addListener is not a function", segun el
// orden en que caian los archivos.
describe('test-setup', () => {
  const original = window.matchMedia;

  it('un test puede reemplazar matchMedia', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => ({ matches: true }),
    });

    expect(window.matchMedia).not.toBe(original);
  });

  it('el siguiente test recibe el matchMedia original', () => {
    expect(window.matchMedia).toBe(original);
  });
});
