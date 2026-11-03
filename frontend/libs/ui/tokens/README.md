# ui-tokens

Fuente unica de verdad para color, tipografia, espaciado, radios, sombras, z-index y
breakpoints del frontend. Ningun componente debe escribir un color, espaciado o radio a mano.

## Fuente y generacion

- `tokens.json` es el unico archivo que se edita.
- `scripts/generate.mjs` genera, sin dependencias nuevas:
  - `src/styles/tokens.css`: primitivos y semanticos como `--nv-*`, tema claro en `:root` y
    oscuro en `.nv-tema-oscuro`, mas los alias temporales `--nucleo-*`;
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
