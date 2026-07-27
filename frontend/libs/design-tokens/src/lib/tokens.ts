/**
 * Fuente de verdad de los tokens de diseno del nucleo. Ningun componente
 * (ui-shared, shell, o futuros modulos) debe usar un valor de color,
 * espaciado, tipografia o radio "a mano" -- siempre importa de aqui, o del
 * espejo en CSS (../styles/tokens.scss) para estilos que no pueden
 * importar TypeScript.
 *
 * Para cambiar un token: edita el valor aqui Y en tokens.scss (mismo
 * nombre, mismo valor). Ver README.md de esta libreria para el detalle
 * completo de por que son dos archivos y como mantenerlos sincronizados.
 */

/** Paleta primaria (acciones, enlaces, elementos activos). Placeholder -- swap facil por la marca real. */
export const colorPrimary = {
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
} as const;

/** Paleta de superficie (fondos, bordes, texto neutro). */
export const colorSurface = {
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
} as const;

/**
 * Colores semanticos -- usados por StatusBadgeComponent y por cualquier
 * estado de negocio (venta completada/anulada, apartado activo/vencido,
 * licencia vigente/expirada, etc). El significado de cada estado lo
 * define quien consume el badge (ver StatusBadgeComponent), no este
 * archivo -- aqui solo viven los 4 colores base.
 */
export const semanticColors = {
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#0891b2',
} as const;

/** Escala de espaciado, base 4px. */
export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
} as const;

/** Radios de borde. */
export const radius = {
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  full: '9999px',
} as const;

/** Tipografia: familia + escala de tamanos. Densidad de admin/ERP (base 14px, no 16px). */
export const typography = {
  fontFamily: `'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`,
  fontSize: {
    xs: '0.75rem',
    sm: '0.8125rem',
    base: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  },
} as const;

export type ColorPrimaryShade = keyof typeof colorPrimary;
export type ColorSurfaceShade = keyof typeof colorSurface;
export type SemanticColorName = keyof typeof semanticColors;
