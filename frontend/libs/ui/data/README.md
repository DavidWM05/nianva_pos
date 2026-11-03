# @nianva/ui-data

Contrato de listados API-06 y tabla server-side reutilizable. Las pantallas
declaran columnas tipadas; la libreria resuelve formato, estado, skeleton,
paginacion y acciones de fila. No se usa todavia en pantallas: la revision
visual va en el catalogo (UI-14).

```html
<ui-filter-bar
  [meta]="meta()"
  [hayFiltros]="hayFiltros()"
  (limpiar)="limpiarFiltros()"
/>

<ui-tabla
  [columnas]="columnas"
  [filas]="filas()"
  [meta]="meta()"
  [cargando]="cargando()"
  [filaInactiva]="esInactiva"
  [mensajeVacio]="'Sin ventas en este periodo.'"
  (cambio)="cargar($event)"
  (accion)="ejecutar($event.fila, $event.accion)"
/>
```

```ts
import { ColumnaListado, MetaListado, parametrosListado } from '@nianva/ui-data';

interface Venta {
  id: number;
  folio: string;
  total: number;
  estado: string;
  activo: boolean;
}

const columnas: ColumnaListado<Venta>[] = [
  { tipo: 'principal', campo: 'folio', encabezado: 'Folio', ordenable: true },
  { tipo: 'dinero', campo: 'total', encabezado: 'Total', ordenable: true },
  { tipo: 'estado', campo: 'estado', encabezado: 'Estado', entidad: 'venta' },
  { tipo: 'acciones', acciones: (fila) => [{ tipo: 'ver' }, { tipo: 'estado', activo: fila.activo }] },
];

const query = parametrosListado({ page: 1, rows: 25, sortField: 'folio', sortOrder: 'asc' }, { q: 'A-001' });
```

## Componentes

- `ui-tabla`: `p-table` lazy con paginacion 25/50/100, orden server-side,
  skeleton en la primera carga, `ui-empty` sin resultados y fila inactiva.
  Emite `cambio` (`CambioListado`) y `accion` (`{ fila, accion }`). No abre
  detalle al pulsar la fila: el detalle se declara como accion `ver`.
- `ui-filter-bar`: resumen `Mostrando X–Y de Z` con `cantidad` y boton
  `Limpiar` solo cuando `hayFiltros`.
- `ui-empty`: mensaje e icono configurables.

## Tipos

`MetaListado` refleja el meta de API-06 (`total`, `page`, `rows`,
`filtros_aplicados`, `permisos`). `parametrosListado` convierte
`CambioListado` + filtros al query del backend, omite vacios/null y limita
`page`/`rows` (maximo 100). Las columnas son una union discriminada por
`tipo`: `texto`, `principal`, `dinero`, `cantidad`, `porcentaje`, `fecha`,
`fechaHora`, `estado` y `acciones`.
