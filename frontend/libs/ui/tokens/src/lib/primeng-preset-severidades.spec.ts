import { describe, expect, it } from 'vitest';

import { nucleoPreset } from './primeng-preset';

type EstadoBoton = { background: string; hoverBackground: string; activeBackground: string };

const raiz = (nucleoPreset as { components: { button: { root: Record<string, EstadoBoton> } } }).components.button
  .root;

describe('preset PrimeNG: botones de severidad', () => {
  it.each(['danger', 'warn', 'success', 'info'])('%s cambia de fondo al pasar el puntero y al presionar', (severidad) => {
    const boton = raiz[severidad];

    expect(boton.hoverBackground).not.toBe(boton.background);
    expect(boton.activeBackground).not.toBe(boton.hoverBackground);
    expect(boton.activeBackground).not.toBe(boton.background);
  });
});
