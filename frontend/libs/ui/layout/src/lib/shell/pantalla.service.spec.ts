import { TestBed } from '@angular/core/testing';
import { breakpoints } from '@nianva/ui-tokens';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ANCHO_PANTALLA_MD, PantallaService } from './pantalla.service';

describe('PantallaService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('el ancho por defecto es el breakpoint md de ui/tokens', () => {
    expect(TestBed.inject(ANCHO_PANTALLA_MD)).toBe(breakpoints.md);
  });

  it('consulta por debajo de md y sigue sus cambios', () => {
    let alCambiar: ((evento: MediaQueryListEvent) => void) | undefined;
    const matchMedia = vi.fn((consulta: string) => ({
      media: consulta,
      matches: true,
      addEventListener: (_: string, fn: (evento: MediaQueryListEvent) => void) => (alCambiar = fn),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('matchMedia', matchMedia);

    const pantalla = TestBed.inject(PantallaService);

    expect(matchMedia).toHaveBeenCalledWith(`(max-width: ${breakpoints.md - 1}px)`);
    expect(pantalla.angosta()).toBe(true);

    alCambiar?.({ matches: false } as MediaQueryListEvent);
    expect(pantalla.angosta()).toBe(false);
  });
});
