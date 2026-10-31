# Frontend de Núcleo

Workspace Nx (Angular, standalone components, sin NgModules) para el frontend del núcleo. Los
10 módulos base (Inventario, Precios, CRM, TPV, Apartados, Devoluciones, Gastos, Configuración,
Auditoría, Núcleo/Auth) **y** los módulos de negocio propios de Nianva POS construidos encima
(Cotizaciones, CRM Avanzado, CxC, CxP, Pedidos, Gift Cards, Notas de Crédito, Payroll, Préstamos,
Producción, Unidades de Medida, Ventas a Plazos, Reportes — ver la raíz del repo,
[`../README.md`](../README.md#módulos-de-negocio-nianva-pos), para el detalle de cada uno)
están construidos sobre el mismo shell de navegación, sistema de tokens de diseño y librería de
componentes compartidos que describe este README.

## Estructura

```
frontend/
├── apps/
│   └── pos/          App principal: sidebar, breadcrumbs, rutas de todos los modulos
├── libs/
│   ├── design-tokens/         Paleta, tipografia, espaciado, radios -- fuente unica de verdad
│   └── ui-shared/              Componentes base reutilizables (tabla, badge, dialogo, form, etc.)
```

## Comandos

```bash
pnpm install
pnpm exec nx serve pos       # dev server
pnpm exec nx build pos       # build de produccion
pnpm exec nx test pos        # tests de la app
pnpm exec nx test ui-shared           # tests de la libreria de componentes
pnpm exec nx sync                     # sincroniza project references de TS (correr tras agregar libs/apps)
```

## Sistema de tokens de diseño (`libs/design-tokens`)

Ver `libs/design-tokens/README.md` para el detalle completo. Resumen: los valores viven en
`tokens.ts` (TypeScript) y se espejan en `tokens.scss` (CSS custom properties). PrimeNG lee
su paleta de `primeng-preset.ts` (`definePreset(Aura, {...})` con nuestros colores), nunca del
tema Aura default -- cambiar un color es una edición en `tokens.ts` + `tokens.scss`.

## `libs/ui-shared`

Cuándo usar cada componente:

- `DataTableComponent` (`nucleo-data-table`) -- listas paginadas server-side (paginación/orden/
  filtros vía evento `lazyLoad`), virtual scroll habilitado por defecto. Úsalo para cualquier
  pantalla `*-list` que consulta un endpoint paginado.
- `StatusBadgeComponent` (`nucleo-status-badge`) -- badge de estado genérico (`[value]` +
  `[colorMap]`); el color por valor lo define quien lo usa, el componente no sabe de dominios
  de negocio. Úsalo para pintar `estado`/`tipo` en listas y vistas de detalle.
- `ConfirmDialogService` + `ConfirmDialogHostComponent` -- reemplazo de `confirm()` de JS
  (`await confirmDialog.confirm({ message, severity: 'danger' })`). Úsalo antes de cualquier
  acción destructiva o irreversible (anular, cancelar, eliminar).
- `ToastService` (`libs/ui-shared/src/lib/toast`) -- notificaciones no bloqueantes
  (`toast.success(detail, summary?)` / `toast.error(detail, summary?)`, summary por defecto
  `'Listo'`/`'Error'`). Requiere `ToastHostComponent` montado una sola vez en el shell (ya está
  en `ShellLayoutComponent`) -- no hay que montarlo por módulo. Úsalo para confirmar que una
  acción de guardar/actualizar terminó bien, o que falló por algo que no sea un 422 de
  validación (esos se reflejan en el propio formulario, ver `setServerErrors` más abajo).
- `DynamicFormComponent` (`nucleo-dynamic-form`) -- constructor de formularios (Reactive Forms)
  a partir de un array de `DynamicFormField`, con validación consistente. Soporta campos
  condicionales vía `dependsOn: { field, values }`: el campo solo se muestra (y solo exige sus
  validadores) cuando el control `field` tiene uno de los `values` -- ej. en el formulario de
  reglas de precio, `valor`/`cantidad_compra`/`precio_bundle` dependen de qué `tipo` de regla
  se eligió. Expone `setServerErrors(errors)` para reflejar los 422 de validación del backend
  directo en el campo correspondiente. Úsalo para cualquier formulario de alta/edición que no
  necesite un layout custom.
  - **Patrón `readonly`** (usado en toda vista `*-detalle`, ver la convención de vistas más
    abajo): el `@Input() readonly` global deshabilita todos los controles y oculta el botón de
    submit -- así el mismo componente de formulario sirve para el modo "visualizar" (usuario sin
    permiso de editar) y el modo "editar" (usuario con permiso), sin duplicar plantillas. Un
    campo puede además marcarse `field.readonly` individualmente (p. ej. un id autogenerado que
    no debe tocarse ni en modo edición). En el submit, el componente lee `form.getRawValue()` en
    vez de `form.value` -- un control deshabilitado no aparece en `.value`, pero su valor sigue
    siendo parte del registro que se envía.
- `AuditLogViewerComponent` (`nucleo-audit-log-viewer`) -- pestaña de auditoría montable en
  cualquier vista de registro, recibe `[tabla]` + `[registroId]` y consulta `GET /api/v1/auditoria`
  filtrado. Úsalo solo si el modelo está en `config('auditoria.auditables')` del backend (ver
  `backend/README.md`) -- si no, la pestaña no tendría nada que mostrar.
- `RecordTabsComponent` (`nucleo-record-tabs`) -- patrón de vista de registro con pestañas
  (General/Relacionado/Auditoría), un `<ng-template>` por pestaña vía content projection.
  **Estructura obligatoria de toda vista `*-detalle`** de una entidad raíz -- ver la convención
  de vistas más abajo; hoy la usan las 22 pantallas `*-detalle` del frontend (`grep -rl ""
  apps/pos/src/app/modules --include="*-detalle.component.ts"` para la lista completa
  y actualizada), sin ninguna excepción.
- `EntidadSelectorComponent` (`nucleo-entidad-selector`) -- autocomplete server-side de una
  entidad (`[buscador]`) con, opcionalmente, un segundo select en cascada de sus "hijos"
  (`[buscadorHijos]`). No importa el servicio concreto de ningún módulo -- ver la sección
  siguiente. Úsalo para elegir cliente/producto/categoría/variante desde un módulo distinto al
  que los expone.

## Convención de navegación

`apps/pos/src/app/modules/modules.config.ts` es la **fuente única de verdad** del
sidebar -- agregar un módulo nuevo es una línea ahí, no tocar `SidebarComponent` ni duplicar la
lista en `app.routes.ts` (las rutas se arman aparte, pero deben apuntar a los mismos `path`).

- `NUCLEO_ITEM_INICIO` -- un único ítem, fuera de cualquier grupo: "Inicio" es siempre el primer
  link del sidebar, sin encabezado de sección ni lógica de expandir/colapsar.
- `NUCLEO_NAV_GROUPS: NucleoNavGroup[]` -- el resto de módulos, agrupados en secciones
  colapsables (hoy: `Catálogo`, `Transacciones`, `Nómina`, `Producción`, `Reportes`,
  `Configuración` -- ver `modules.config.ts` para la lista viva). Cada grupo arranca colapsado
  salvo el que contiene la ruta activa (`SidebarComponent.grupoInicialExpandido()`).
- **Separador visual dentro de un grupo, sin ser un ítem de navegación**: un
  `NucleoModuleNavItem` puede llevar `separadorAntes: true` -- el sidebar renderiza una línea
  divisoria (`.sidebar__separador`, un `border-top` de 1px) inmediatamente antes de ese link, sin
  agregar un ítem clickeable ni un encabezado propio. Hoy el único uso es distinguir
  "Preferencias" (personal, cualquier usuario autenticado) del resto del grupo Configuración
  (administración del tenant: Usuarios, Roles, Empresa, Métodos de pago, Auditoría) -- viven en
  el mismo grupo porque visualmente pertenecen "del mismo lado", pero la línea dice que
  Preferencias es una categoría distinta sin necesitar su propio grupo colapsable de un solo
  ítem.

```ts
{
  key: 'configuracion',
  label: 'Configuración',
  items: [
    { key: 'usuarios', label: 'Usuarios', path: 'usuarios', icon: 'pi pi-user' },
    // ...
    { key: 'preferencias', label: 'Preferencias', path: 'perfil/preferencias', icon: 'pi pi-lock', separadorAntes: true },
  ],
}
```

## Convención de vistas: ruta dedicada vs. modal

- **Toda entidad raíz** (la que tiene su propia tabla de negocio con `tenant_id`, no un
  "detalle"/"pago" fijo de otra) usa **rutas dedicadas**, no modales, para las tres operaciones:
  - `GET /modulo` -- lista paginada (`nucleo-data-table`).
  - `/modulo/nuevo` -- `<Entidad>CrearComponent` (p. ej. `CategoriaCrearComponent`), ruta
    estática registrada ANTES de `/modulo/:id` en `app.routes.ts` (si no, el router
    interpretaría `nuevo` como un `id`).
  - `/modulo/:id` -- `<Entidad>DetalleComponent` (p. ej. `CategoriaDetalleComponent`), usa
    `RecordTabsComponent` (ver arriba) con al menos una pestaña "General" (el formulario, en
    modo `readonly` si el usuario no tiene permiso de editar) y, si el modelo está auditado, una
    pestaña "Auditoría".
  - Ambas pantallas reutilizan el mismo `<Entidad>FormComponent` (crear = formulario vacío
    editable; detalle = formulario precargado, `readonly` según permiso) -- nunca hay dos
    formularios distintos para la misma entidad.
- **El modal (`p-dialog`) se reserva para sub-recursos genuinamente anidados**, que no tienen
  (ni se planea que tengan) su propia lista/detalle:
  - Variantes de un producto (`producto-detalle`) -- viven y mueren con su producto.
  - Compras registradas contra una variante (`producto-detalle`) -- una compra no es un
    catálogo navegable por sí sola en esta pantalla, es una acción puntual sobre el stock.
  - Gastos dentro de una sesión de caja (`caja.component`) -- documentado en `backend/README.md`
    como un módulo "sin pantalla propia".
  - Confirmaciones/resultados de una acción (p. ej. cancelar un apartado en
    `apartado-detalle`) -- no son un recurso, son un paso de un flujo.
  - Alta rápida de un catálogo de apoyo desde el contexto de otro módulo (p. ej. "Nuevo
    proveedor" desde `producto-detalle`) -- válido cuando ese catálogo no tiene (todavía) una
    pantalla `*-list`/`*-detalle` propia; si la gana, el modal debería dejar de ser la vía
    principal de alta.

## Patrón `BuscadorEntidad` / `BuscadorDeHijos` + tokens de DI

`EntidadSelectorComponent` necesita buscar una entidad de otro módulo (ej. TPV busca clientes
de CRM, Precios busca productos de Inventario) **sin importar el servicio concreto de ese
módulo** -- eso violaría las direcciones de dependencia documentadas en `backend/README.md` y
su equivalente en frontend. Las excepciones documentadas, todas hacia `modules/tpv` (mismo
criterio en los 5 casos: reutilizar lo que TPV ya resuelve en vez de duplicarlo) crecieron con
el sistema, no son solo las 2 originales:

- `modules/apartados` y `modules/devoluciones` -- reutilizan los componentes de captura de
  línea de TPV (`LineasProductoComponent`/`LineasPagoComponent`) para armar su propio carrito,
  en vez de reconstruir esa UI.
- `modules/cotizaciones` -- mismo motivo que los dos anteriores (`lineas-cotizacion` reutiliza
  `LineasProductoComponent`/`VentaService` de TPV).
- `modules/ventas-plazos` -- necesita elegir la venta sobre la que se arma un plan de pago
  (`VentaBuscadorService` adapta `VentaService.listar()`/`obtener()` al contrato
  `BuscadorEntidad`, mismo patrón de siempre, pero la entidad "buscable" en sí es de TPV).
- `modules/reportes` -- el reporte de ventas por periodo (`ReporteVentasComponent`) llama
  `VentaService.reporte()` directo: es el mismo dato de TPV, no una búsqueda de entidad, así que
  no aplica el patrón `Buscador` aquí, solo reutiliza el servicio.

El mecanismo, en tres piezas:

1. **Contrato genérico** (`libs/ui-shared/src/lib/entidad-selector/entidad-selector.types.ts`):
   `abstract class BuscadorEntidad<T> { buscar(texto): Observable<T[]>; obtener(id): Observable<T>; }`.
   `ui-shared` no sabe qué hay detrás.
2. **Token de inyección por tipo de entidad**, en `apps/pos/src/app/core/buscadores-entidad.tokens.ts`
   (vive en `app/core`, no en `ui-shared` ni en ningún módulo, porque tanto quien consume la
   entidad como quien la expone necesitan referenciarlo sin importarse entre sí):

   ```ts
   export const BUSCADOR_CLIENTE = new InjectionToken<BuscadorEntidad>('BUSCADOR_CLIENTE');
   ```

3. **Implementación concreta**, en el módulo dueño de la entidad, y su registro en
   `app.config.ts` -- el único archivo que conecta ambos lados:

   ```ts
   // modules/crm/cliente-buscador.service.ts
   @Injectable({ providedIn: 'root' })
   export class ClienteBuscadorService extends BuscadorEntidad<Cliente> {
     private readonly clienteService = inject(ClienteService);
     buscar(texto: string) { /* adapta ClienteService.listar(...) */ }
     obtener(id: number) { /* adapta ClienteService.obtener(...) */ }
   }

   // app.config.ts
   providers: [
     { provide: BUSCADOR_CLIENTE, useExisting: ClienteBuscadorService },
   ]
   ```

   El módulo consumidor (TPV) solo hace `inject(BUSCADOR_CLIENTE)` y lo pasa a
   `<nucleo-entidad-selector [buscador]="buscadorCliente" />` -- nunca importa
   `ClienteBuscadorService` ni `ClienteService` directamente.

Tokens hoy (`core/buscadores-entidad.tokens.ts`): `BUSCADOR_PRODUCTO`,
`BUSCADOR_VARIANTE_DE_PRODUCTO` (cascada, `BuscadorDeHijos`), `BUSCADOR_CATEGORIA`,
`BUSCADOR_CLIENTE`, `BUSCADOR_USUARIO`, `BUSCADOR_UNIDAD_MEDIDA`, `BUSCADOR_INSUMO`,
`BUSCADOR_RECETA`, `BUSCADOR_VENTA`.

## Lazy loading + `@defer`

Cada módulo es una ruta con `loadComponent` propia en `apps/pos/src/app/app.routes.ts`
-- su bundle no se descarga hasta que se navega a él (ver el desglose de chunks en la salida de
`pnpm exec nx build pos`).

Dentro de una pantalla ya cargada, la pestaña de Auditoría de cualquier vista de registro se
difiere un nivel más con `@defer (on viewport)`, para no pagar el costo de
`AuditLogViewerComponent` (ni la llamada a `GET /api/v1/auditoria`) hasta que el usuario
efectivamente hace scroll hasta esa pestaña. Ejemplo real, `cliente-detalle.component.html`:

```html
<ng-template>
  @defer (on viewport) {
    <nucleo-audit-log-viewer [tabla]="'clientes'" [registroId]="clienteActual.id" />
  } @placeholder {
    <p>Auditoría (se carga al hacer scroll hasta aquí)...</p>
  } @loading (minimum 200ms) {
    <p>Cargando...</p>
  }
</ng-template>
```

Mismo patrón en las demás 21 vistas `*-detalle` que tienen pestaña de Auditoría (`grep -rl
"@defer" apps/pos/src/app/modules --include="*.html"` para la lista completa --
prácticamente toda vista de registro auditada lo usa). `apps/pos/src/app/demo/registro-ejemplo.component.ts`
sigue como el scaffold mínimo original de este patrón (útil para copiar/pegar en un módulo
nuevo), pero ya no es el único ejemplo -- es una entre 22 pantallas de negocio reales que lo
usan hoy.

## Ver también

[docs/MANUAL_TECNICO.md](../docs/MANUAL_TECNICO.md) -- catálogo de patrones a nivel de todo el
núcleo (backend + frontend) y el runbook para clonar este repo en un producto nuevo.
