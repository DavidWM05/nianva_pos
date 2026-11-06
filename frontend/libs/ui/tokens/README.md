# ui-tokens

Fuente unica de verdad para color, tipografia, espaciado, radios, sombras, z-index y
breakpoints del frontend. Ningun componente debe escribir un color, espaciado o radio a mano.

## Fuente y generacion

- `tokens.json` es el unico archivo que se edita.
- `scripts/generate.mjs` genera, sin dependencias nuevas:
  - `src/styles/tokens.css`: primitivos y semanticos como `--nv-*`, tema claro en `:root` y
    oscuro en `.nv-tema-oscuro`, mas los alias temporales `--nucleo-*`;
  - `src/styles/material.scss`: tema M3 de Angular Material generado desde estos tokens;
  - `src/lib/primeng-preset.ts`: preset de PrimeNG (Aura) con `colorScheme.light` y
    `colorScheme.dark`;
  - `src/lib/breakpoints.ts`.
- Los archivos generados se versionan. No se editan a mano.

Desde `frontend/`:

```sh
node libs/ui/tokens/scripts/generate.mjs
node libs/ui/tokens/scripts/generate.mjs --check
```

`--check` falla si un archivo generado no coincide con `tokens.json`.

## Consumo

- `apps/pos` importa `nucleoPreset` desde `@nianva/ui-tokens` en `app.config.ts`.
- El CSS se carga una sola vez desde `apps/pos/src/styles.scss`; el `includePaths` de SCSS
  apunta a `libs/ui/tokens/src/styles`.
- Las pantallas actuales siguen usando `--nucleo-*`. Esos alias apuntan a los `--nv-*`
  equivalentes y se retiran al completar la migracion de pantallas (plan, punto 12).

## Tema oscuro

`TemaService` aplica `.nv-tema-oscuro` en `<html>` segun `prefers-color-scheme` y la
preferencia guardada en `localStorage` (`nv-tema`: `claro`, `oscuro` o `sistema`). Todavia
no hay interruptor visible: las pantallas usan grises primitivos y se migraran despues.

## Compatibilidad

Los valores primitivos son los mismos de la lib anterior `design-tokens`; el tema claro no
cambia. Los tokens semanticos (`fondo`, `texto`, `primario`, estados, etc.) son la base para
las pantallas nuevas y para `ui-modal`.

## Tema de Angular Material

`src/styles/material.scss` se genera desde `tokens.json` y se carga desde el `styles` de
`apps/catalogo-ui` y `apps/pos`. La estructura M3 usa la tipografia, la densidad y los
radios de los tokens; los roles de color apuntan a semanticos, por lo que el tema oscuro
sale al cambiar `.nv-tema-oscuro`.

| Rol Material | Token |
|---|---|
| `background` | `--nv-fondo` |
| `on-background` | `--nv-texto` |
| `surface` | `--nv-superficie` |
| `on-surface` | `--nv-texto` |
| `surface-variant` | `--nv-fondo-elevado` |
| `on-surface-variant` | `--nv-texto-suave` |
| `surface-bright` | `--nv-superficie` |
| `surface-dim` | `--nv-fondo` |
| `surface-tint` | `--nv-primario` |
| `surface-container-lowest` | `--nv-superficie` |
| `surface-container-low` | `--nv-fondo` |
| `surface-container` | `--nv-superficie` |
| `surface-container-high` | `--nv-fondo-elevado` |
| `surface-container-highest` | `--nv-fondo-elevado` |
| `primary` | `--nv-primario` |
| `on-primary` | `--nv-primario-texto` |
| `primary-container` | `--nv-primario-suave` |
| `on-primary-container` | `--nv-primario` |
| `primary-fixed` | `--nv-fondo-elevado` |
| `primary-fixed-dim` | `--nv-fondo-elevado` |
| `on-primary-fixed` | `--nv-primario` |
| `on-primary-fixed-variant` | `--nv-primario` |
| `secondary` | `--nv-texto-suave` |
| `on-secondary` | `--nv-superficie` |
| `secondary-container` | `--nv-fondo-elevado` |
| `on-secondary-container` | `--nv-texto` |
| `secondary-fixed` | `--nv-fondo-elevado` |
| `secondary-fixed-dim` | `--nv-fondo-elevado` |
| `on-secondary-fixed` | `--nv-texto` |
| `on-secondary-fixed-variant` | `--nv-texto-suave` |
| `tertiary` | `--nv-info-texto` |
| `on-tertiary` | `--nv-superficie` |
| `tertiary-container` | `--nv-fondo-elevado` |
| `on-tertiary-container` | `--nv-info-texto` |
| `tertiary-fixed` | `--nv-fondo-elevado` |
| `tertiary-fixed-dim` | `--nv-fondo-elevado` |
| `on-tertiary-fixed` | `--nv-info-texto` |
| `on-tertiary-fixed-variant` | `--nv-info-texto` |
| `error` | `--nv-peligro` |
| `on-error` | `--nv-texto-invertido` |
| `error-container` | `--nv-fondo-elevado` |
| `on-error-container` | `--nv-peligro-texto` |
| `outline` | `--nv-borde` |
| `outline-variant` | `--nv-borde` |
| `inverse-surface` | `--nv-texto` |
| `inverse-on-surface` | `--nv-superficie` |
| `inverse-primary` | `--nv-primario` |
| `scrim` | `--nv-sombra` |
| `shadow` | `--nv-sombra` |
| `neutral10` | `--nv-sombra` |
| `neutral-variant20` | `--nv-sombra` |