import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import tokens from '../../tokens.json';

const ROLES_MATERIAL = [
  'background',
  'error',
  'error-container',
  'inverse-on-surface',
  'inverse-primary',
  'inverse-surface',
  'neutral-variant20',
  'neutral10',
  'on-background',
  'on-error',
  'on-error-container',
  'on-primary',
  'on-primary-container',
  'on-primary-fixed',
  'on-primary-fixed-variant',
  'on-secondary',
  'on-secondary-container',
  'on-secondary-fixed',
  'on-secondary-fixed-variant',
  'on-surface',
  'on-surface-variant',
  'on-tertiary',
  'on-tertiary-container',
  'on-tertiary-fixed',
  'on-tertiary-fixed-variant',
  'outline',
  'outline-variant',
  'primary',
  'primary-container',
  'primary-fixed',
  'primary-fixed-dim',
  'scrim',
  'secondary',
  'secondary-container',
  'secondary-fixed',
  'secondary-fixed-dim',
  'shadow',
  'surface',
  'surface-bright',
  'surface-container',
  'surface-container-high',
  'surface-container-highest',
  'surface-container-low',
  'surface-container-lowest',
  'surface-dim',
  'surface-tint',
  'surface-variant',
  'tertiary',
  'tertiary-container',
  'tertiary-fixed',
  'tertiary-fixed-dim',
] as const;

function contenidoMaterial(): string {
  return readFileSync(new URL('../styles/material.scss', import.meta.url), 'utf8');
}

function tokensSemanticos(): Set<string> {
  return new Set([
    ...Object.keys(tokens.semantic.light),
    ...Object.keys(tokens.semantic.dark),
  ]);
}

describe('tema Material generado', () => {
  it('define todos los roles de color que usa Material', () => {
    const definidos = new Map(
      [...contenidoMaterial().matchAll(/--mat-sys-([a-z0-9-]+):\s*var\(--nv-([a-z0-9-]+)\);/g)]
        .map((coincidencia) => [coincidencia[1], coincidencia[2]]),
    );

    for (const rol of ROLES_MATERIAL) {
      expect(definidos.has(rol), `Falta --mat-sys-${rol}`).toBe(true);
    }
  });

  it('cada rol apunta a un token semantico existente', () => {
    const tokensDisponibles = tokensSemanticos();
    const asignaciones = [...contenidoMaterial().matchAll(/--mat-sys-([a-z0-9-]+):\s*var\(--nv-([a-z0-9-]+)\);/g)];

    for (const [, rol, token] of asignaciones) {
      expect(tokensDisponibles.has(token), `--mat-sys-${rol} apunta a --nv-${token}, que no existe`).toBe(true);
    }
  });

  it('no tiene colores literales', () => {
    expect(contenidoMaterial()).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
  });
});
