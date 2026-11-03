import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Generado por scripts/generate.mjs. No editar a mano. */
export const nucleoPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '2px',
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
    },
  },
  semantic: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
      color: '{primary.500}',
      contrastColor: '#ffffff',
      hoverColor: '{primary.600}',
      activeColor: '{primary.700}',
    },
    surface: {
      0: '#ffffff',
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
    colorScheme: {
      light: {
        primary: {
          color: "#3b82f6",
          contrastColor: "#ffffff",
          hoverColor: "#2563eb",
          activeColor: "#1d4ed8",
        },
      },
      dark: {
        primary: {
          color: "#60a5fa",
          contrastColor: "#0f172a",
          hoverColor: "#93c5fd",
          activeColor: "#60a5fa",
        },
        surface: {
          "0": "#1e293b",
          "50": "#0f172a",
          "100": "#1e293b",
          "200": "#334155",
          "300": "#cbd5e1",
          "400": "#cbd5e1",
          "500": "#cbd5e1",
          "600": "#f8fafc",
          "700": "#f8fafc",
          "800": "#f8fafc",
          "900": "#f8fafc",
          "950": "#f8fafc",
        },
        text: {
          color: "#f8fafc",
          hoverColor: "#f8fafc",
          mutedColor: "#cbd5e1",
          hoverMutedColor: "#f8fafc",
        },
      },
    },
  },
});
