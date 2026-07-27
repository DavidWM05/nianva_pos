# design-tokens

Fuente unica de verdad para paleta, tipografia, espaciado y radios de borde del frontend
de Nucleo. Ningun componente debe hardcodear un color/espaciado/radio -- siempre desde aqui.

## Archivos

- `src/lib/tokens.ts` -- los valores en si (TypeScript, `as const`). Es el archivo que
  editas cuando cambias un token.
- `src/lib/primeng-preset.ts` -- toma `tokens.ts` y construye `nucleoPreset`, el preset de
  PrimeNG (via `definePreset(Aura, ...)`) que se registra en `app.config.ts` de
  `nucleo-shell`. Todos los componentes de PrimeNG (botones, tabla, dialogos, etc.) leen su
  color de aqui, no del tema Aura default.
- `src/styles/tokens.scss` -- el mismo valor de cada token, como CSS custom properties
  (`--nucleo-color-primary-500`, etc.), para el SCSS de nuestros propios componentes
  (`ui-shared`, el shell) que no pueden importar TypeScript. Se importa una sola vez en
  `apps/nucleo-shell/src/styles.scss`.

## Como cambiar un token (ej. el color primario)

1. Edita el valor en `tokens.ts` (ej. `colorPrimary[500]`).
2. Edita el **mismo** valor en `tokens.scss` (`--nucleo-color-primary-500`).
3. No se toca nada mas. `primeng-preset.ts` importa `tokens.ts` directamente, asi que la
   proxima vez que la app arranca, todos los componentes de PrimeNG (Button, DataTable,
   Dialog, ...) usan el nuevo color automaticamente -- no hay que tocar cada componente ni
   el archivo del preset.

### Por que dos archivos (tokens.ts + tokens.scss) y no uno solo

PrimeNG (v22, arquitectura `@primeuix/themes`) construye sus variables CSS en tiempo de
ejecucion a partir de un objeto JavaScript (`definePreset`), no de un archivo `.scss` --
por eso `primeng-preset.ts` necesita los valores en TypeScript. Nuestros propios
componentes, en cambio, usan SCSS/CSS normal y no pueden importar un modulo `.ts` dentro de
una hoja de estilos. Mantener ambos archivos sincronizados es un costo pequeno (son ~25
valores) a cambio de no introducir un paso de build adicional (generar `.scss` desde `.ts`)
en esta primera version del sistema de diseno.

## Paleta actual (placeholder, facil de reemplazar por la marca real)

| Token | Valor |
|---|---|
| `colorPrimary[500]` | `#3b82f6` (azul) |
| `colorSurface[500]` | `#64748b` (gris neutro) |
| `semanticColors.success` | `#16a34a` |
| `semanticColors.warning` | `#d97706` |
| `semanticColors.danger` | `#dc2626` |
| `semanticColors.info` | `#0891b2` |
| `typography.fontFamily` | Inter, system-ui, ... |
| `typography.fontSize.base` | `0.875rem` (14px, densidad de admin/ERP) |
| `radius.md` | `0.375rem` (6px) |
| `spacing[4]` | `1rem` (16px) |
