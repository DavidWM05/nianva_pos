import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

import { colorPrimary, colorSurface, radius } from './tokens';

/**
 * Preset de PrimeNG construido a partir de libs/design-tokens -- NUNCA los
 * colores default de Aura. Se sobreescriben los slots semanticos
 * (semantic.primary, semantic.surface) con los valores literales de
 * tokens.ts, en vez de dejar que apunten a las paletas nombradas de Aura
 * (emerald, slate, etc). Asi, cambiar un color en tokens.ts cambia todos
 * los componentes de PrimeNG automaticamente la proxima vez que se
 * reconstruya el preset -- no hay una segunda copia de la paleta aqui.
 *
 * Como cambiar un token y que se refleje en todos los componentes:
 * 1. Edita el valor en tokens.ts (y su espejo en ../styles/tokens.scss,
 *    ver el README de esta libreria).
 * 2. No se toca nada mas: este archivo lee tokens.ts en tiempo de
 *    build/arranque, PrimeNG regenera sus variables CSS (--p-primary-500,
 *    etc.) a partir de este preset la proxima vez que la app arranca.
 */
export const nucleoPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '2px',
      sm: radius.sm,
      md: radius.md,
      lg: radius.lg,
      xl: radius.xl,
    },
  },
  semantic: {
    primary: {
      50: colorPrimary[50],
      100: colorPrimary[100],
      200: colorPrimary[200],
      300: colorPrimary[300],
      400: colorPrimary[400],
      500: colorPrimary[500],
      600: colorPrimary[600],
      700: colorPrimary[700],
      800: colorPrimary[800],
      900: colorPrimary[900],
      950: colorPrimary[950],
      color: '{primary.500}',
      contrastColor: '#ffffff',
      hoverColor: '{primary.600}',
      activeColor: '{primary.700}',
    },
    surface: {
      0: colorSurface[0],
      50: colorSurface[50],
      100: colorSurface[100],
      200: colorSurface[200],
      300: colorSurface[300],
      400: colorSurface[400],
      500: colorSurface[500],
      600: colorSurface[600],
      700: colorSurface[700],
      800: colorSurface[800],
      900: colorSurface[900],
      950: colorSurface[950],
    },
  },
});
