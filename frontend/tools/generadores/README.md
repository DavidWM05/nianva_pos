# Generadores de Nx (`@nianva/generadores`)

Plugin local de Nx. Se resuelve por el alias `@nianva/generadores` de `tsconfig.base.json` y
no depende de `@nx/devkit`: cada generador escribe con el `tree` que le pasa Nx.

## `ui-listado` (UI-09)

Crea una pantalla de listado con la composición de la regla:
`ui-page-header` → `ui-filter-bar` → `ui-tabla` (con `ui-empty`), dentro de `ui-page` para el
error con "Reintentar".

```
pnpm nx g @nianva/generadores:ui-listado \
  --entidad=nota-credito --plural=notas-credito \
  --modulo=notas-credito --clave=notas-credito \
  --endpoint=/notas-credito --genero=f
```

| Opción | Qué es |
|---|---|
| `entidad` | Singular en kebab-case. Da la interfaz y el servicio: `NotaCredito`, `NotaCreditoListadoService` |
| `plural` | Plural en kebab-case. Da el componente: `NotasCreditoListadoComponent` |
| `modulo` | Carpeta de `apps/pos/src/app/modules` |
| `clave` | Clave del registro de navegación que usa `ui-page-header` (UI-08) |
| `endpoint` | Ruta del listado en la API, con `/` inicial |
| `genero` | `m` (por defecto) o `f`, para "Nuevo" o "Nueva" en el botón de crear |

Crea, sin sobrescribir nada que ya exista:

- `modules/<modulo>/<entidad>.types.ts`: la fila, con `id`, `nombre` y `activo`, para ajustar;
- `modules/<modulo>/<entidad>-listado.service.ts`: `listar()` con el contrato de API-06;
- `modules/<modulo>/pages/<plural>-listado/`: el componente, su plantilla y su spec (carga
  inicial, búsqueda con `q` y error con "Reintentar").

Al terminar imprime lo que falta a mano: la ruta en `app.routes.ts`, la entrada en
`NUCLEO_NAV_GROUPS` y, si es la primera pantalla con `ui-data` o `ui-actions`, `pnpm nx sync`.

Los tests (`ui-listado/index.test.mjs`) corren en CI en el paso "Probar generadores" y pasan
la plantilla generada por las reglas de lint propias.
