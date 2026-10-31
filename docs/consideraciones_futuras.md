# Consideraciones a futuro

Notas de cosas que se detectaron durante el desarrollo, se decidió no resolver en el momento
(por alcance, por prioridad, o porque no bloqueaban nada), y vale la pena revisar más adelante.
No es un backlog formal — es la memoria de "esto lo vimos y lo dejamos pasar a propósito, no
por descuido".

## Frontend

### Convención para el stub de `ResizeObserver` en specs con `RecordTabsComponent`

jsdom no implementa `ResizeObserver`, y PrimeNG's `TabList` (detrás de `RecordTabsComponent`) lo
usa en `ngAfterViewInit`. El stub necesario:

```ts
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
```

dispara `@typescript-eslint/no-empty-function` porque los tres métodos no tienen cuerpo. Se
copió a 22 archivos `*-detalle.component.spec.ts` sin el `eslint-disable`, y quedó como deuda de
lint (75 errores) hasta que se limpió en este ajuste. **A futuro**: cualquier spec nuevo que
renderice `RecordTabsComponent` debe envolver el stub así desde el principio:

```ts
/* eslint-disable @typescript-eslint/no-empty-function */
if (typeof globalThis.ResizeObserver === 'undefined') {
  ...
}
/* eslint-enable @typescript-eslint/no-empty-function */
```

Sería razonable moverlo a un helper compartido (`test-setup.ts` o similar) en vez de copiarlo en
cada spec, para que este tipo de deuda no pueda reaparecer.

### Migrar de "mostrar todo + toast en 403" a permisos reales en 9 módulos

Desde el ajuste 9, `permisosDe()` en Prestamos/Producción/CuentasPagar/CuentasCobrar/GiftCards/
Payroll/Pedidos/NotasCredito/CrmInteracciones ya devuelve las acciones reales del módulo (ej.
`{ver, crear, completar, transformar}` en Producción) en vez de un `{crear, editar, eliminar}`
genérico que no coincidía con el catálogo real de permisos. El frontend de estos módulos sigue
con el criterio anterior (mostrar los botones de acción siempre, dejar que un 403 real se vea
como toast) porque así se decidió mientras el backend no exponía el dato correcto. Ahora que sí
lo expone, vale la pena evaluar si conviene ocultar los botones según `meta.permisos` real en
vez de mostrarlos siempre — mejor UX (no se ofrece una acción que se sabe de antemano que va a
fallar), a cambio de tener que mantener la lista de acciones sincronizada entre backend y
frontend en cada módulo.

### CRM Campañas: sin selección manual de clientes

`CampanaFormComponent` solo permite elegir un `segmento` (todos/nuevo/frecuente/vip/inactivo) —
el backend también acepta `cliente_ids` (array) para selección manual, pero no se construyó esa
UI porque `EntidadSelectorComponent` es de selección única y no existe un componente de
multi-selección de entidades en `ui-shared`. Si se necesita selección manual de clientes para una
campaña, hace falta ese componente nuevo (o una lista con checkboxes ad-hoc).

### Presupuesto de bundle excedido

Cada build de producción (`nx build pos --configuration=production`) reporta el
initial chunk por encima del budget configurado (~777 KB vs 500 KB). No se investigó a fondo —
candidatos obvios: revisar qué se está cargando eager en vez de lazy, o simplemente subir el
budget en `project.json` si 777 KB ya es un tamaño aceptado. Warning recurrente, no bloqueante.

### Dependencia `qrcode` no es ESM

`two-factor-setup.component.ts` importa `qrcode`, que no es un paquete ESM — el build reporta un
"optimization bailout" por eso en cada corrida. No afecta funcionalidad, pero si se busca reducir
el tamaño del bundle inicial es un punto a revisar (buscar una alternativa ESM o aceptar el
bailout).

## Backend / Arquitectura

### Auditar el resto del código por el mismo patrón de `#[Fillable]` desincronizado

El bug encontrado en `VentasPlazosService` (migraciones `add_*` posteriores que agregan columnas
sin que nadie actualice el `#[Fillable]` del modelo — Eloquent descarta esos campos en silencio
porque el proyecto no tiene `Model::preventSilentlyDiscardingAttributes()` activado) se corrigió
puntualmente para `PlanPagoCliente`/`PlanPagoClienteCuota`, pero el patrón en sí no se descartó
en el resto del código. Vale la pena:

1. Activar `Model::preventSilentlyDiscardingAttributes()` al menos en `local`/`testing` (en
   `AppServiceProvider::boot()`), para que este tipo de error truene en desarrollo en vez de
   perder datos en silencio en producción.
2. Hacer un barrido de `Schema::table(...)` en migraciones posteriores a la creación de cada
   tabla, cruzando contra el `#[Fillable]` del modelo correspondiente.

### `sucursal_id` aceptado como campo de request en vez de resuelto del usuario autenticado

Documentado como hallazgo recurrente durante el desarrollo del frontend: varios endpoints de
creación (ej. `ProductoVarianteController::store()`, `VentaController::store()`) aceptan
`sucursal_id` en el payload en vez de tomarlo siempre de `$request->user()->sucursal_id`. El
frontend nunca expone ese campo como editable (siempre lo resuelve del usuario autenticado), así
que hoy no es explotable desde la UI oficial — pero sigue siendo una superficie de autoridad
abierta si algo más le pega directo a la API. No se tocó porque no bloqueaba nada del alcance de
esta ronda, pero es un candidato a "cerrar" del lado del backend (ignorar el campo del payload si
viene, o validarlo contra el usuario autenticado).

### CRM Campañas sin `index()` / historial

`CrmAvanzadoController::enviarCampana()` crea y envía en la misma acción — no hay forma de listar
campañas ya enviadas (el catálogo real de permisos para `crm_campanas` es únicamente `['enviar']`,
sin `ver`). Si el negocio pide ver un historial de campañas, hace falta que backend agregue
`GET /crm/campanas` + el permiso `crm_campanas.ver`.

### Patrón N+1 en dos de los endpoints de Reportes

- `CrmAvanzadoController::reporte()` calcula `clientes_por_segmento` llamando
  `calcularSegmento($cliente->id)` en un loop por cada cliente del tenant (2 queries por
  cliente). Se dejó pasar a propósito (se le dio la opción explícita a backend de elegir entre
  "al vuelo con query agregada" vs. simplicidad, y eligió la versión simple) — funciona bien para
  el volumen de un tenant típico en desarrollo, pero escala mal si un tenant real acumula
  cientos/miles de clientes.
- `VentaController::reporte()` resuelve `metodo_pago_nombre` y `producto_nombre`/`talla`/`color`
  accediendo a `$fila->metodoPago`/`$fila->variante->producto` sobre resultados de una query
  `selectRaw()->groupBy()` (sin `->with()`) — cada fila dispara sus propias queries de relación
  en vez de un join o eager load. Con "top 10 productos" el impacto es mínimo hoy, pero es el
  mismo patrón.

Ninguno de los dos rompe nada ni da resultados incorrectos — es una nota de performance a futuro
si el volumen de datos por tenant crece, no un bug.

## Producto / Funcionalidad

### Módulo de Reportes — completo

`reportes_cuentas_cobrar` (antigüedad de saldos CxC), `reportes_cuentas_pagar` (antigüedad de
saldos CxP), `reportes_crm` (segmentos, interacciones, loyalty, campañas) y `reportes` general
(ventas por periodo, con filtro de fecha/sucursal) — los 4 permisos sembrados en
`NucleoRolesPermisosSeeder` ya tienen pantalla y endpoint construidos. Cerrado.

## Mejora de experiencia en inicio 2fa

El codigo para la aplicacion autentificadora deberia mostrarse en qr o evaluar opciones