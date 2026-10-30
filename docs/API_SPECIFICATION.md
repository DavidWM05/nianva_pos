# API_SPECIFICATION.md — Contrato de API: Endpoints Nuevos (Detalle Quirúrgico)

> **Rol:** Diseñador de API REST Senior (Skill `APIDesigner`).
> **Inputs usados:** `01_ARQUITECTURA_BASE.md` (columnas/FKs reales), `02_CONTRATO_API.md` (contrato
> propuesto por el Orquestador), `03_ESPECIFICACION_BACKEND.md` (Services y reglas de dominio),
> y los `Resource`/`Controller` reales de Núcleo (`ClienteResource`, `ProductoResource`,
> `ReglaPrecioResource`, `ClienteController`, `ProductoController`, `VentaController`,
> `ApartadoController`, `DevolucionController`, `GastoController`) como plantilla de formato.
> **Alcance:** los 12 módulos nuevos aprobados. No repite documentación de endpoints ya
> existentes en Núcleo.

---

## 0. Hallazgos y correcciones aplicadas sobre los documentos de entrada

Antes de detallar los endpoints, esto es lo que se corrigió respecto a lo que proponían
`02_CONTRATO_API.md` / `03_ESPECIFICACION_BACKEND.md`, y por qué — para que el Orquestador y
`BackendEngineer` lo tengan presente:

1. **Formato de paginación real ≠ el citado en `02_CONTRATO_API.md` §0.** El doc de contrato
   describe un meta `{current_page, per_page, total, last_page}` y query params genéricos
   (`per_page`, `search`, `desde`, `hasta`). Verificado contra 5 controllers reales
   (`ClienteController`, `ProductoController`, `VentaController`, `ApartadoController`,
   `DevolucionController`): **ninguno** usa ese shape. El real es `page`/`rows` (default 25, máx
   100) + `sort_field`/`sort_order` + `filtro_<campo>` por columna filtrable, y la respuesta es
   `{data, meta: {total, permisos}}` — sin `current_page`/`last_page`/`per_page` en la respuesta
   (el frontend los deriva de `total` + `rows` que él mismo mandó). **Este documento usa el
   formato real en todos los endpoints de listado**, no el citado en `02_CONTRATO_API.md`.
2. **La nota de `02_CONTRATO_API.md`/skill sobre "productos y clientes no paginan" es
   incorrecta hoy.** `ClienteController::index()` y `ProductoController::index()` sí paginan
   (`->paginate($rows, ...)`). Por decisión del usuario, **todos los listados de los módulos
   nuevos paginan**, incluyendo catálogos chicos como `unidades-medida`.
3. **Conflicto de namespace de permisos: Producción, Payroll, Préstamos y Ventas a Plazos.**
   `02_CONTRATO_API.md` dice que estos 4 módulos "reusan permisos existentes" (`inventario.*`,
   `gastos.ver`, `clientes.*`). Pero `03_ESPECIFICACION_BACKEND.md` §16 ya define y siembra un
   namespace propio (`produccion.*`, `payroll.*`, `prestamos.*`, `ventas_plazos.*`) — y §15
   agrega `ventas_plazos.ver` al rol `vendedor`. Un namespace propio es además consistente con
   el resto del catálogo (`cuentas_cobrar.*`, `cotizaciones.*`, `pedidos.*`, `gift_cards.*` —
   ninguno reusa el permiso de otro módulo). **Este documento usa el namespace propio de §16**
   como fuente de verdad, y completa las acciones que §16 dejó incompletas (ver §3 más abajo).
4. **`abonos_cuenta`, `abonos_pagar` y `prestamo_pagos` no siguen la regla de "Pago mixto"
   (CLAUDE.md §3).** Esa regla dice que toda entidad que cobra/paga usa una tabla `*_pagos`
   dedicada para permitir métodos de pago combinados — así se construyó `venta_pagos`,
   `apartado_abono_pagos`, `devolucion_pagos`. Pero `01_ARQUITECTURA_BASE.md` diseñó
   `abonos_cuenta`/`abonos_pagar` con un solo `metodo_pago_id` + `monto` en la fila del abono
   (sin sub-tabla), y `prestamo_pagos` ni siquiera tiene `metodo_pago_id`. No es algo que yo
   pueda corregir — el esquema de columnas es un input fijo para mí (no invento columnas fuera
   de la migración) — así que este documento **respeta el esquema tal como está** (un abono/pago
   = un solo método de pago, sin split). Queda marcado aquí como una divergencia real de la
   regla arquitectónica para que `BackendEngineer`/Orquestador decidan si vale la pena
   extenderla a una sub-tabla antes de migrar.
5. **`POST /api/cuentas-cobrar` y `POST /api/cuentas-pagar` no existen como endpoints propios.**
   `03_ESPECIFICACION_BACKEND.md` §2.1/§3.1 es explícito: la CxC/CxP se crea por **orquestación**
   dentro de `VentaController::store()` / `CompraController::store()` cuando la venta/compra es a
   crédito — nunca por un POST directo al recurso. Documentado en §14 (Extensiones a endpoints
   existentes), no como alta independiente.
6. **Ventas a Plazos: dos flujos propuestos, se elige el que no rompe el límite de
   orquestación.** `03_ESPECIFICACION_BACKEND.md` §12 propone orquestar la creación del plan
   dentro de `VentaController::store()` (la llama "instancia #8"). Pero CLAUDE.md §2 es
   explícito: hoy solo hay 3 instancias de orquestación permitidas, y una 4ª ya exige
   justificación caso por caso — apilar 5+ instancias nuevas (CxC, CxP, Notas de Crédito, Gift
   Card, Ventas a Plazos) todas dentro de `VentaController`/`CompraController`/
   `DevolucionController` es una expansión de arquitectura que el Orquestador debe decidir
   explícitamente, no algo que yo deba asumir en silencio. Este documento **usa el endpoint
   dedicado `POST /api/ventas/{ventaId}/plan-pago`** que sí aparece en `02_CONTRATO_API.md` §12
   — evita agregar una instancia de orquestación nueva en `VentaController::store()` porque el
   plan se adjunta después, sobre una venta ya creada. Igual aplica la construcción de CxC/CxP
   (§5 arriba): si el Orquestador prefiere consolidar todo en `store()`, este contrato debe
   revisarse.
7. **Permisos y `error_code` faltantes, agregados aquí (marcados `[NUEVO]`):**
   `produccion.editar`, `ventas_plazos.pagar`, `orden_produccion_estado_invalido`,
   `monto_no_coincide_cuota`, `puntos_insuficientes`, `gift_card_saldo_insuficiente`,
   `pedido_sin_items_para_venta`, `cuota_ya_pagada`. Cada uno tiene su justificación en la
   sección del módulo correspondiente.
8. **`unidades-medida`: "sin permiso" solo aplica a lectura.** `02_CONTRATO_API.md` dice
   "Permiso base: No requiere — es catálogo transversal" para *todo* el módulo, incluyendo
   `POST`/`PUT`/`DELETE`. No hay precedente en el repo de una mutación sin permiso (ni
   `/auditoria`, `/configuracion/publica`, ni `/dispositivos-confiables` mutan sin exigir algo);
   dejar catálogos compartidos editables por cualquier usuario autenticado es una superficie de
   riesgo real (cualquier cajero podría borrar una unidad de medida en uso). Este documento gatea
   **solo el `GET`** como abierto (cualquier usuario autenticado del tenant) y las mutaciones
   bajo `inventario.crear`/`inventario.editar`/`inventario.eliminar` (mismo namespace que
   `producto_variantes`, que es quien consume `unidad_medida_id`).

---

## 1. Convenciones aplicadas (reales, no las citadas en `02_CONTRATO_API.md`)

### 1.1 Respuesta de éxito

```json
// 200 — listado
{
  "data": [ { "...": "..." } ],
  "meta": {
    "total": 42,
    "permisos": { "crear": true, "editar": true, "eliminar": false }
  }
}

// 200 — recurso individual
{
  "data": { "...": "..." },
  "meta": { "permisos": { "editar": true, "eliminar": false } }
}

// 201 — creado (Resource::response(), sin envolver meta salvo que se documente)
{ "data": { "...": "..." } }
```

`meta.permisos` solo incluye las acciones relevantes a esa pantalla (mismo criterio que
`ApartadoController::show()` con `abonar`/`cancelar`, no un set fijo `crear/editar/eliminar`).

### 1.2 Paginación y filtros (listados)

| Query Param | Tipo | Default | Notas |
|---|---|---|---|
| `page` | int | 1 | |
| `rows` | int | 25 | `max(1, min(100, rows))` |
| `sort_field` | string | — | Debe estar en la whitelist `CAMPOS_ORDENABLES` del controller; si no, orden por defecto del módulo |
| `sort_order` | `asc`\|`desc` | `asc` | |
| `filtro_<campo>` | string/int | — | Un query param por columna filtrable. Texto → `LIKE %valor%`; FK/enum → `where` exacto (ver `filtro_venta_id` en `DevolucionController`, `filtro_categoria_id` en `ProductoController`) |

### 1.3 Errores (sin cambios respecto a `02_CONTRATO_API.md`)

```json
// 422 validación Laravel nativa
{ "message": "Los datos proporcionados no son válidos.", "errors": { "campo": ["..."] } }

// 422 negocio
{ "message": "...", "error_code": "abono_excede_saldo", "...campos_propios_de_la_excepcion" }

// 403 módulo no activo
{ "message": "El módulo 'cxc' no está activo para este tenant", "error_code": "modulo_no_activo" }
```

### 1.4 Feature gating

```php
Route::middleware(['auth:sanctum', 'two-factor.confirmed', 'modulo:cxc'])->group(function () {
    // rutas de CxC
});
```

Slug por módulo: `cxc`, `cxp`, `cotizaciones`, `delivery`, `gift_cards`, `crm_avanzado`. Los
módulos de "prioridad baja" (`unidades_medida`, `produccion`, `ventas_plazos`, `payroll`,
`prestamos`, `notas_credito`) no aparecen en el default de `modulos_activos` de
`01_ARQUITECTURA_BASE.md` §1 — si el Orquestador quiere gatearlos igual, agregar sus slugs al
array default y al middleware; si no, quedan siempre activos (sin esta capa) y solo protegidos
por permiso normal.

### 1.5 Validación de FKs tenant-scoped — **regla nueva, no la convención heredada**

El código existente usa `exists:tabla,columna` plano (`VentaController`, `ApartadoController`,
`DevolucionController`). Es una convención heredada que **CLAUDE.md §3 prohíbe explícitamente
para código nuevo**: `exists:` corre una query cruda que ignora cualquier global scope de
tenant (`BelongsToTenant`), así que un `cliente_id`/`proveedor_id`/`variante_id` de **otro**
tenant pasaría la validación. Todo endpoint nuevo de este documento que valide una FK hacia una
entidad con `tenant_id` propio usa:

```php
use Illuminate\Validation\Rule;

'cliente_id' => ['required', 'integer', Rule::exists('clientes', 'id')
    ->where('tenant_id', app(TenantContext::class)->id())],
```

Para entidades con `BelongsToTenantViaRelacion` (ej. `cuenta_cobrar_id` al validar un
`abono_cuenta`), el `where` se hace sobre la tabla padre vía subquery o resolviendo el modelo
padre primero y comparando su `tenant_id` en el Service — no hay una forma directa de anidar
`Rule::exists` dos niveles, así que la responsabilidad cae en el Service (mismo patrón que
`ApartadoService`/`DevolucionService` ya validan pertenencia de sub-recursos).

---

## 2. Módulo CxC — Cuentas por Cobrar

**Permiso base:** `cuentas_cobrar.ver` · **Feature gate:** `modulo:cxc`

> No existe `POST /api/cuentas-cobrar` — se crea por orquestación desde `VentaController::store()`
> (ver §14.1).

#### `GET /api/cuentas-cobrar`
**Permiso:** `cuentas_cobrar.ver`

| Query | Tipo | Notas |
|---|---|---|
| `filtro_estado` | string | `pendiente`\|`pagada`\|`anulada` |
| `filtro_cliente_id` | int | |
| `filtro_vencidas` | bool | `fecha_vencimiento < today AND estado = pendiente` |
| `sort_field` | string | `fecha_vencimiento`, `saldo_pendiente`, `monto_total` |

```json
{
  "data": [{
    "id": 1, "venta_id": 42,
    "cliente": { "id": 5, "nombre": "Juan Pérez" },
    "monto_total": 2500.00, "saldo_pendiente": 1500.00,
    "fecha_vencimiento": "2026-08-15", "estado": "pendiente",
    "dias_vencida": 0, "created_at": "2026-07-27T10:00:00"
  }],
  "meta": { "total": 42, "permisos": { "registrar_abono": true, "anular": true } }
}
```
`dias_vencida` es calculada (`max(0, today - fecha_vencimiento)`), no una columna.

#### `GET /api/cuentas-cobrar/{cuentaCobrar}`
**Permiso:** `cuentas_cobrar.ver`
```json
{
  "data": {
    "id": 1,
    "venta": { "id": 42, "total": 2500.00, "fecha": "2026-07-20T15:00:00" },
    "cliente": { "id": 5, "nombre": "Juan Pérez", "telefono": "..." },
    "monto_total": 2500.00, "saldo_pendiente": 1500.00,
    "fecha_vencimiento": "2026-08-15", "estado": "pendiente",
    "abonos": [{ "id": 1, "monto": 1000.00, "metodo_pago": "Efectivo", "referencia": null, "fecha": "..." }],
    "created_at": "..."
  },
  "meta": { "permisos": { "registrar_abono": true, "anular": true } }
}
```

#### `POST /api/cuentas-cobrar/{cuentaCobrar}/abonos`
**Permiso:** `cuentas_cobrar.registrar_abono`
```json
{ "monto": 500.00, "metodo_pago_id": 1, "caja_sesion_id": 5, "referencia": null }
```
| Campo | Validación |
|---|---|
| `monto` | `required, numeric, min:0.01` |
| `metodo_pago_id` | `required, integer,` `Rule::exists('metodos_pago','id')->where('tenant_id', $tenantId)` |
| `caja_sesion_id` | `nullable, integer, exists:caja_sesiones,id` (mismo tenant vía sesión activa del usuario, no user input libre) |
| `referencia` | `nullable, string, max:100` |

`usuario_id` se resuelve del request autenticado, nunca del body (mismo patrón que
`GastoController::store()`).

| Código | error_code |
|---|---|
| 422 | `abono_excede_saldo` |
| 422 | `cuenta_ya_pagada` |
| 422 | `cuenta_anulada` |

**Response 200:**
```json
{
  "data": { "abono": { "id": 2, "monto": 500.00 }, "cuenta": { "id": 1, "saldo_pendiente": 1000.00, "estado": "pendiente" } }
}
```

#### `POST /api/cuentas-cobrar/{cuentaCobrar}/anular`
**Permiso:** `cuentas_cobrar.anular`

| Código | error_code |
|---|---|
| 422 | `cuenta_con_abonos` |

Response: `CuentaCobrarResource` actualizada (estado `anulada`).

---

## 3. Módulo CxP — Cuentas por Pagar

**Permiso base:** `cuentas_pagar.ver` · **Feature gate:** `modulo:cxp`

> No existe `POST /api/cuentas-pagar` — orquestada desde `CompraController::store()` (§14.2). No
> hay endpoint de anulación: el catálogo de permisos sembrado (`01_ARQUITECTURA_BASE.md` §15)
> nunca definió `cuentas_pagar.anular`, y `02_CONTRATO_API.md` tampoco lo lista — se asume
> intencional (una CxP se cancela cancelando la compra origen, fuera de este módulo).

#### `GET /api/cuentas-pagar`
**Permiso:** `cuentas_pagar.ver`

| Query | Notas |
|---|---|
| `filtro_estado` | `pendiente`\|`pagada`\|`anulada` |
| `filtro_proveedor_id` | int |

```json
{
  "data": [{
    "id": 1, "compra_id": 10,
    "proveedor": { "id": 3, "nombre": "Distribuidora XYZ" },
    "monto_total": 8000.00, "saldo_pendiente": 3000.00,
    "fecha_vencimiento": "2026-08-01", "estado": "pendiente"
  }],
  "meta": { "total": 12, "permisos": { "registrar_pago": true } }
}
```

#### `GET /api/cuentas-pagar/{cuentaPagar}`
**Permiso:** `cuentas_pagar.ver` — detalle + `pagos` (mismo shape que `abonos` de CxC).

#### `POST /api/cuentas-pagar/{cuentaPagar}/pagos`
**Permiso:** `cuentas_pagar.registrar_pago`
```json
{ "monto": 5000.00, "metodo_pago_id": 3, "caja_sesion_id": 5, "referencia": "TRF-2026-001" }
```
Misma validación tenant-scoped que abonos de CxC.

| Código | error_code |
|---|---|
| 422 | `pago_excede_saldo` |
| 422 | `cuenta_pagar_ya_pagada` |
| 422 | `cuenta_pagar_anulada` |

---

## 4. Módulo Cotizaciones

**Permiso base:** `cotizaciones.ver` · **Feature gate:** `modulo:cotizaciones`

#### `GET /api/cotizaciones`
**Permiso:** `cotizaciones.ver`

| Query | Notas |
|---|---|
| `filtro_estado` | `pendiente`\|`convertida`\|`vencida`\|`anulada` |
| `filtro_cliente_id` | int |
| `filtro_numero_cotizacion` | LIKE, ej. `filtro_numero_cotizacion=COT-000` |
| `sort_field` | `created_at`, `total`, `fecha_vencimiento` |

```json
{
  "data": [{
    "id": 1, "numero_cotizacion": "COT-000001",
    "cliente": { "id": 5, "nombre": "Juan Pérez" },
    "sucursal_id": 1, "total": 1750.00, "descuento": 0,
    "estado": "pendiente", "fecha_vencimiento": "2026-08-11", "created_at": "..."
  }],
  "meta": { "total": 8, "permisos": { "crear": true, "editar": true, "eliminar": true, "convertir": true } }
}
```

#### `POST /api/cotizaciones`
**Permiso:** `cotizaciones.crear`
```json
{
  "cliente_id": 5, "sucursal_id": 1, "validez_dias": 15, "descuento": 0,
  "uso_cfdi": "G01", "observaciones": "Cotización para evento corporativo",
  "items": [
    { "variante_id": 10, "cantidad": 5, "precio_unitario": 150.00, "descuento": 0 },
    { "variante_id": 15, "cantidad": 2, "precio_unitario": 300.00, "descuento": 50.00 }
  ]
}
```
| Campo | Validación |
|---|---|
| `cliente_id` | `nullable, integer,` tenant-scoped `exists` (cotización sin cliente permitida) |
| `sucursal_id` | `required, integer, exists:sucursales,id` |
| `validez_dias` | `nullable, integer, min:1, max:365` (default 15) |
| `descuento` | `nullable, numeric, min:0` |
| `uso_cfdi` | `nullable, string, max:10` |
| `items` | `required, array, min:1` |
| `items.*.variante_id` | `required, integer,` tenant-scoped `exists:producto_variantes,id` |
| `items.*.cantidad` | `required, integer, min:1` (`cantidad_invalida` es redundante con esta regla — se documenta igual porque el catálogo de `02_CONTRATO_API.md` ya lo lista) |
| `items.*.precio_unitario` | `required, numeric, min:0` |
| `items.*.descuento` | `nullable, numeric, min:0` |

`numero_cotizacion` y `fecha_vencimiento` se calculan en el Service, nunca del body. **No
descuenta stock** (regla de dominio explícita en `03_ESPECIFICACION_BACKEND.md` §4).

| Código | error_code |
|---|---|
| 422 | `variante_no_existe` (si `Rule::exists` scoped falla, cae como validación 422 nativa — no como `error_code` custom; se documenta el nombre porque `02_CONTRATO_API.md` lo lista, pero técnicamente es un mensaje de `errors.items.N.variante_id`, no un `error_code` propio) |
| 422 | `variante_inactiva` |
| 422 | `cliente_inactivo` |

**Response 201:** `CotizacionResource` con `items` cargados.

#### `GET /api/cotizaciones/{cotizacion}`
**Permiso:** `cotizaciones.ver` — detalle + `items` (variante, cantidad, precio_unitario,
descuento, subtotal).

#### `PUT /api/cotizaciones/{cotizacion}`
**Permiso:** `cotizaciones.editar` — mismas validaciones que `POST`. Reemplaza items (borra +
reinserta, mismo patrón que `ReglaPrecioController`/recetas).

| Código | error_code |
|---|---|
| 422 | `cotizacion_no_editable` |

#### `DELETE /api/cotizaciones/{cotizacion}`
**Permiso:** `cotizaciones.eliminar` — soft, marca `anulada`.

| Código | error_code |
|---|---|
| 422 | `cotizacion_no_anulable` |

#### `POST /api/cotizaciones/{cotizacion}/convertir`
**Permiso:** `cotizaciones.convertir`
```json
{ "pagos": [{ "metodo_pago_id": 1, "monto": 1750.00 }], "caja_sesion_id": 5 }
```
Corrección sobre `02_CONTRATO_API.md`: el body original mandaba `forma_pago` +
`monto_recibido` como si solo aceptara un método — pero la venta generada usa el mismo
`VentaService::registrarVenta()` de siempre, que exige `pagos: [{metodo_pago_id, monto}]`
(pago mixto real, ver `VentaController::store()`). Se usa el mismo shape aquí para no reinventar
un segundo contrato de pago.

| Código | error_code |
|---|---|
| 422 | `cotizacion_vencida` |
| 422 | `cotizacion_ya_convertida` |
| 422 | `stock_insuficiente` (reusa Núcleo) |
| 422 | `sin_cliente` |
| 422 | `pago_no_cuadra` (reusa Núcleo, vía `VentaService`) |

**Response 200:** `{ "data": { "venta_id": 88, "cotizacion": { "id": 1, "estado": "convertida" } } }`

---

## 5. Módulo CRM Avanzado (Extensión)

**Feature gate:** `modulo:crm_avanzado` · Sin `Service`/`Controller` propio de "CRM" — vive
como extensión del `ClienteController` existente (sub-recursos anidados bajo `/clientes/{id}`),
consistente con `VentaController::porCliente()` que ya vive anidado bajo `/clientes/{cliente}`.

#### `GET /api/clientes/{cliente}/interacciones`
**Permiso:** `crm.interacciones.ver`

| Query | Notas |
|---|---|
| `filtro_tipo` | `llamada`\|`email`\|`whatsapp`\|`nota`\|`visita` |
| `sort_field` | `fecha` |

```json
{
  "data": [{ "id": 1, "tipo": "llamada", "observacion": "...", "usuario": { "id": 2, "nombre": "Ana" }, "fecha": "..." }],
  "meta": { "total": 5, "permisos": { "crear": true } }
}
```

#### `POST /api/clientes/{cliente}/interacciones`
**Permiso:** `crm.interacciones.crear`
```json
{ "tipo": "llamada", "observacion": "Cliente llamó para preguntar por estado de su pedido" }
```
| Campo | Validación |
|---|---|
| `tipo` | `required,` `Rule::in(['llamada','email','whatsapp','nota','visita'])` |
| `observacion` | `required, string, max:2000` |

`usuario_id` = usuario autenticado. Response 201: `CrmInteraccionResource`.

#### `GET /api/clientes/{cliente}/loyalty`
**Permiso:** `loyalty.ver`
```json
{
  "data": {
    "cliente": { "id": 5, "nombre": "Juan Pérez" },
    "puntos_loyalty": 350, "puntos_acumulados": 1200,
    "historial": [{ "tipo": "ganados", "puntos": 100, "referencia_tabla": "ventas", "referencia_id": 42, "fecha": "..." }]
  },
  "meta": { "permisos": { "ajustar": true } }
}
```
`historial` pagina igual que cualquier listado (`page`/`rows`) si crece — se documenta como
sub-array simple aquí porque `02_CONTRATO_API.md` no lo pedía paginado y el volumen esperado por
cliente es bajo; si un tenant acumula miles de movimientos, mover a `GET
/clientes/{id}/loyalty/historial` paginado aparte.

#### `POST /api/clientes/{cliente}/loyalty/ajustar`
**Permiso:** `loyalty.ajustar`
```json
{ "puntos": -50, "motivo": "Ajuste por devolución" }
```
| Campo | Validación |
|---|---|
| `puntos` | `required, integer` (positivo o negativo, `!= 0`) |
| `motivo` | `required, string, max:255` |

`tipo` en `loyalty_transacciones` se infiere: `puntos > 0` → `ajuste` (ganados vía ajuste
manual), `puntos < 0` → `ajuste` (canje manual) — un solo enum `ajuste` cubre ambos signos, no
hace falta que el cliente lo mande.

| Código | error_code |
|---|---|
| 422 | `puntos_insuficientes` **[NUEVO]** — `puntos_loyalty + puntos < 0`. `03_ESPECIFICACION_BACKEND.md` regla #5 ("`puntos_loyalty` nunca puede ser negativo") no tenía `error_code` asignado; se agrega aquí siguiendo el mismo esquema que el resto. |

#### `POST /api/crm/campanas/enviar`
**Permiso:** `crm.campanas.enviar`
```json
{
  "segmento": "vip",
  "asunto": "Oferta especial para clientes VIP",
  "mensaje": "Hola {{nombre}}, tenemos un 20% de descuento...",
  "enviar_a": "todos"
}
```
| Campo | Validación |
|---|---|
| `segmento` | `required_without:cliente_ids,` `Rule::in(['todos','nuevo','frecuente','vip','inactivo'])` |
| `cliente_ids` | `required_without:segmento, array` — cada uno tenant-scoped `exists:clientes,id` |
| `asunto` | `required, string, max:200` |
| `mensaje` | `required, string, max:5000` |

Fire-and-forget (encola `Mail`), no bloquea la respuesta HTTP en el envío real.

**Response 200:** `{ "data": { "clientes_alcanzados": 34 }, "message": "Campaña en proceso de envío" }`

---

## 6. Módulo Delivery / Pedidos

**Permiso base:** `pedidos.ver` · **Feature gate:** `modulo:delivery`

#### `GET /api/pedidos`
**Permiso:** `pedidos.ver`

| Query | Notas |
|---|---|
| `filtro_estado` | `pendiente`\|`preparando`\|`en_camino`\|`entregado`\|`cancelado` |
| `filtro_repartidor_id` | int — el rol `repartidor` (permiso `pedidos.ver` únicamente, ver `03_ESPECIFICACION_BACKEND.md` §15) debe recibir esto **forzado a su propio `id`** desde el Controller, no confiar en lo que mande — mismo criterio que "nunca confíes en lo que manda el cliente para un dato de autorización" |
| `filtro_cliente_id` | int |
| `filtro_numero_pedido` | LIKE |

```json
{
  "data": [{
    "id": 1, "numero_pedido": "PED-000001",
    "cliente": { "id": 5, "nombre": "Juan Pérez" },
    "repartidor": { "id": 8, "nombre": "Carlos" },
    "estado": "en_camino", "costo_delivery": 5.00, "tiempo_estimado": 30,
    "direccion_entrega": "Av. Siempre Viva 123", "created_at": "..."
  }],
  "meta": { "total": 15, "permisos": { "crear": true, "cambiar_estado": true, "asignar_repartidor": true } }
}
```

#### `POST /api/pedidos`
**Permiso:** `pedidos.crear`
```json
{
  "sucursal_id": 1, "cliente_id": 5, "direccion_entrega": "Av. Siempre Viva 123",
  "referencia": "Casa blanca, portón negro", "costo_delivery": 5.00, "tiempo_estimado": 30,
  "notas": "Sin cebolla",
  "items": [{ "variante_id": 10, "cantidad": 2, "precio_unitario": 150.00 }]
}
```
| Campo | Validación |
|---|---|
| `sucursal_id` | `required, integer, exists:sucursales,id` |
| `cliente_id` | `required, integer,` tenant-scoped `exists` |
| `direccion_entrega` | `nullable, string` |
| `costo_delivery` | `nullable, numeric, min:0` |
| `tiempo_estimado` | `nullable, integer, min:0` |
| `items` | `nullable, array` — pedido puede no traer items (`venta_id = null` hasta completarse) |
| `items.*.variante_id` | `required_with:items, integer,` tenant-scoped `exists` |
| `items.*.cantidad` | `required_with:items, integer, min:1` |

`numero_pedido` autogenerado, `usuario_id` = autenticado, `estado = 'pendiente'` por defecto.

#### `GET /api/pedidos/{pedido}`
**Permiso:** `pedidos.ver`

#### `PATCH /api/pedidos/{pedido}/estado`
**Permiso:** `pedidos.cambiar_estado`
```json
{ "estado": "preparando" }
```
Máquina de estados (`03_ESPECIFICACION_BACKEND.md` §6):
```
pendiente → preparando | cancelado
preparando → en_camino | cancelado
en_camino → entregado | cancelado
entregado, cancelado → (terminal)
```

| Código | error_code |
|---|---|
| 422 | `transicion_estado_invalida` |
| 422 | `pedido_sin_items_para_venta` **[NUEVO]** — al pasar a `entregado` sin `venta_id`, el Service genera una venta desde `pedido_items` (`03_ESPECIFICACION_BACKEND.md` §6 regla #2); si el pedido no tiene items y no tiene `venta_id`, no hay de dónde generar la venta. No estaba cubierto en el catálogo de `02_CONTRATO_API.md`. |

Al pasar a `entregado` sin `venta_id`: genera venta automáticamente (misma orquestación que §14.3).

#### `PATCH /api/pedidos/{pedido}/repartidor`
**Permiso:** `pedidos.asignar_repartidor`
```json
{ "repartidor_id": 8 }
```
`repartidor_id` valida `exists:usuarios,id` tenant-scoped, y que el usuario tenga el rol
`repartidor` (o cualquier rol — `03_ESPECIFICACION_BACKEND.md` no es estricto, dice "verificar
con `tienePermiso()` o helper ad-hoc"; se recomienda exigir `pedidos.ver` como mínimo, no un rol
por nombre, para no hardcodear roles igual que el resto del proyecto).

| Código | error_code |
|---|---|
| 422 | `repartidor_no_existe` |
| 422 | `repartidor_no_activo` |
| 422 | `transicion_estado_invalida` (no reasignar en `entregado`/`cancelado`, regla #1 de §6) |

---

## 7. Módulo Gift Cards

**Permiso base:** `gift_cards.ver` · **Feature gate:** `modulo:gift_cards`

#### `GET /api/gift-cards`
**Permiso:** `gift_cards.ver`

| Query | Notas |
|---|---|
| `filtro_cliente_id` | int |
| `filtro_estado` | `activa`\|`usada`\|`expirada`\|`cancelada` |
| `filtro_codigo` | LIKE |

```json
{
  "data": [{
    "id": 1, "codigo": "GC-3-A1B2C3D4",
    "cliente": { "id": 5, "nombre": "Juan Pérez" },
    "saldo_inicial": 500.00, "saldo_actual": 320.00,
    "fecha_expiracion": "2027-01-01", "estado": "activa", "created_at": "..."
  }],
  "meta": { "total": 6, "permisos": { "emitir": true, "recargar": true, "cancelar": true } }
}
```

#### `POST /api/gift-cards`
**Permiso:** `gift_cards.emitir`
```json
{ "cliente_id": 5, "monto": 500.00, "fecha_expiracion": "2027-01-01" }
```
| Campo | Validación |
|---|---|
| `cliente_id` | `nullable, integer,` tenant-scoped `exists` (gift card anónima permitida) |
| `monto` | `required, numeric, min:0.01` |
| `fecha_expiracion` | `nullable, date, after:today` |

`codigo` = `GC-{tenant_id}-{random_alphanumeric_8}` generado en el Service (único, reintenta si
colisiona). `saldo_inicial = saldo_actual = monto`, `estado = 'activa'`.

| Código | error_code |
|---|---|
| 422 | `monto_invalido` |

#### `GET /api/gift-cards/{giftCard}`
**Permiso:** `gift_cards.ver` — detalle + `recargas`.

#### `POST /api/gift-cards/{giftCard}/recargar`
**Permiso:** `gift_cards.recargar`
```json
{ "monto": 200.00 }
```
| Código | error_code |
|---|---|
| 422 | `gift_card_expirada` |
| 422 | `gift_card_cancelada` |

#### `POST /api/gift-cards/{giftCard}/cancelar`
**Permiso:** `gift_cards.cancelar` — sin body. Marca `estado = 'cancelada'`.

---

## 8. Notas de Crédito (Extensión de Devoluciones)

**Permiso base:** `notas_credito.ver` · Solo lectura por HTTP — la creación es 100% orquestada
desde `DevolucionController::store()` cuando `tipo_reembolso = 'nota_credito'` (§14.4). No hay
`POST /api/notas-credito` directo.

#### `GET /api/notas-credito`
**Permiso:** `notas_credito.ver`

| Query | Notas |
|---|---|
| `filtro_estado` | `activa`\|`usada_parcial`\|`usada_total`\|`expirada`\|`cancelada` |
| `filtro_cliente_id` | int |

```json
{
  "data": [{
    "id": 1, "cliente": { "id": 5, "nombre": "Juan Pérez" }, "devolucion_id": 12,
    "monto_original": 300.00, "saldo_disponible": 150.00,
    "fecha_expiracion": null, "estado": "usada_parcial", "created_at": "..."
  }],
  "meta": { "total": 3 }
}
```

#### `GET /api/notas-credito/{notaCredito}`
**Permiso:** `notas_credito.ver` — detalle + `usos` (`venta_id`, `monto_usado`, `created_at`).

#### `GET /api/clientes/{cliente}/notas-credito`
**Permiso:** `notas_credito.ver` — solo `estado = 'activa'` o `usada_parcial` con
`saldo_disponible > 0` (lo que el frontend necesita para ofrecerla como método de pago en TPV,
vía `EntidadSelectorComponent`/`BuscadorEntidad` del cliente ya cargado en la venta — no un
buscador nuevo).

---

## 9. Módulo: Unidades de Medida

**Permiso:** `GET` abierto a cualquier usuario autenticado del tenant (catálogo transversal);
`POST`/`PUT`/`DELETE` bajo `inventario.crear`/`inventario.editar`/`inventario.eliminar` — ver
hallazgo §0.8. **Sin feature gate** (`modulo:*`) — no está en el array default de
`modulos_activos`.

#### `GET /api/unidades-medida`
Sin filtros documentados en `02_CONTRATO_API.md` más allá del listado; se agrega `filtro_activo`
(bool, default solo activas) siguiendo el patrón de `Producto.activo` en `ProductoController`.
```json
{
  "data": [{ "id": 1, "nombre": "Kilogramo", "abreviatura": "kg", "tipo": "fraccionario", "activo": true }],
  "meta": { "total": 12, "permisos": { "crear": true, "editar": true, "eliminar": true } }
}
```

#### `POST /api/unidades-medida`
**Permiso:** `inventario.crear`
```json
{ "nombre": "Kilogramo", "abreviatura": "kg", "tipo": "fraccionario" }
```
| Campo | Validación |
|---|---|
| `nombre` | `required, string, max:50` |
| `abreviatura` | `required, string, max:10,` `Rule::unique('unidades_medida','abreviatura')->where('tenant_id', $tenantId)` |
| `tipo` | `required,` `Rule::in(['entero','fraccionario'])` |

#### `PUT /api/unidades-medida/{unidadMedida}`
**Permiso:** `inventario.editar` — misma validación (unique ignorando el propio id).

#### `DELETE /api/unidades-medida/{unidadMedida}`
**Permiso:** `inventario.eliminar`

| Código | error_code |
|---|---|
| 422 | `unidad_en_uso` |

---

## 10. Módulo: Producción / Recetas

**Namespace de permisos:** `produccion.ver`, `produccion.crear`, `produccion.editar` **[NUEVO
— ver §0.3]**, `produccion.completar`, `produccion.transformar`. **Sin feature gate.**

#### `GET /api/insumos`
**Permiso:** `produccion.ver`

| Query | Notas |
|---|---|
| `filtro_nombre` / `filtro_sku` | LIKE |
| `filtro_stock_bajo` | bool — `stock_actual <= stock_minimo` (suma de `insumo_stocks` por insumo) |

```json
{
  "data": [{
    "id": 1, "nombre": "Harina de trigo", "sku": "HRN-001",
    "unidad_medida": { "id": 2, "abreviatura": "kg" },
    "costo": 18.5000, "stock_minimo": 10, "stock_total": 45.5, "activo": true
  }],
  "meta": { "total": 3, "permisos": { "crear": true, "editar": true } }
}
```

#### `POST /api/insumos`
**Permiso:** `produccion.crear`
```json
{ "nombre": "Harina de trigo", "sku": "HRN-001", "unidad_medida_id": 2, "costo": 18.50, "stock_minimo": 10 }
```
| Campo | Validación |
|---|---|
| `nombre` | `required, string, max:200` |
| `sku` | `nullable, string, max:50, unique:insumos,sku` |
| `unidad_medida_id` | `required, integer,` tenant-scoped `exists:unidades_medida,id` |
| `costo` | `required, numeric, min:0` |
| `stock_minimo` | `nullable, numeric, min:0` |

#### `PUT /api/insumos/{insumo}`
**Permiso:** `produccion.editar` **[NUEVO]** — `03_ESPECIFICACION_BACKEND.md` §16 no sembró
esta acción pero el endpoint sí existe en `02_CONTRATO_API.md` §11; se agrega el permiso para no
gatear una edición completa de insumo bajo `produccion.crear`.

#### `GET /api/insumos/{insumo}/stocks`
**Permiso:** `produccion.ver` — filas de `insumo_stocks` por sucursal + lote.
```json
{ "data": [{ "sucursal_id": 1, "cantidad": 20.0, "lote": "L2026-07", "fecha_vencimiento": "2026-12-31" }] }
```

#### `POST /api/insumos/{insumo}/ajustar-stock`
**Permiso:** `produccion.editar`
```json
{ "sucursal_id": 1, "cantidad": 50, "lote": "L2026-07", "fecha_vencimiento": "2026-12-31", "motivo": "Compra a proveedor" }
```
| Campo | Validación |
|---|---|
| `sucursal_id` | `required, integer, exists:sucursales,id` |
| `cantidad` | `required, numeric` (puede ser negativo para salida manual — `02_CONTRATO_API.md` no aclara signo; se documenta así porque `insumo_stocks.cantidad` no distingue entrada/salida en columna propia) |
| `lote` | `nullable, string, max:50` |
| `fecha_vencimiento` | `nullable, date` |
| `motivo` | `required, string, max:255` |

#### `GET /api/recetas`
**Permiso:** `produccion.ver` · Query: `filtro_variante_id`.

#### `POST /api/recetas`
**Permiso:** `produccion.crear`
```json
{
  "variante_id": 10, "nombre": "Pastel de chocolate", "rendimiento": 1,
  "instrucciones": "Mezclar... hornear...",
  "ingredientes": [
    { "insumo_id": 1, "cantidad": 500, "unidad_medida_id": 2 },
    { "insumo_id": 3, "cantidad": 200, "unidad_medida_id": 2 }
  ]
}
```
| Campo | Validación |
|---|---|
| `variante_id` | `required, integer,` tenant-scoped `exists:producto_variantes,id` |
| `nombre` | `required, string, max:200` |
| `rendimiento` | `required, numeric, min:0.01` |
| `ingredientes` | `required, array, min:1` |
| `ingredientes.*.insumo_id` | `required, integer,` tenant-scoped `exists:insumos,id` |
| `ingredientes.*.cantidad` | `required, numeric, min:0.0001` |
| `ingredientes.*.unidad_medida_id` | `required, integer,` tenant-scoped `exists:unidades_medida,id` |

**Response 201** incluye `costo_total` y `costo_unitario` calculados (`03_ESPECIFICACION_BACKEND.md`
§11: `sum(ingrediente.cantidad * insumo.costo) / rendimiento`).

#### `PUT /api/recetas/{receta}`
**Permiso:** `produccion.editar` **[NUEVO]** — reemplaza ingredientes (borra + reinserta).

#### `GET /api/ordenes-produccion`
**Permiso:** `produccion.ver` · Query: `filtro_estado`, `filtro_sucursal_id`, `filtro_receta_id`.

#### `POST /api/ordenes-produccion`
**Permiso:** `produccion.crear`
```json
{ "sucursal_id": 1, "receta_id": 5, "cantidad_programada": 10, "fecha_programada": "2026-07-30", "notas": "..." }
```
| Campo | Validación |
|---|---|
| `sucursal_id` | `required, integer, exists:sucursales,id` |
| `receta_id` | `required, integer,` tenant-scoped `exists:recetas,id` |
| `cantidad_programada` | `required, integer, min:1` |
| `fecha_programada` | `nullable, date` |

`usuario_id` = autenticado, `estado = 'pendiente'`.

| Código | error_code |
|---|---|
| 422 | `stock_insumos_insuficiente` |

#### `PATCH /api/ordenes-produccion/{ordenProduccion}/estado`
**Permiso:** `produccion.completar`
```json
{ "estado": "completada", "cantidad_producida": 10 }
```
| Campo | Validación |
|---|---|
| `estado` | `required,` `Rule::in(['en_proceso','completada','cancelada'])` |
| `cantidad_producida` | `required_if:estado,completada, integer, min:1` |

| Código | error_code |
|---|---|
| 422 | `orden_produccion_estado_invalido` **[NUEVO]** — no estaba en el catálogo de `02_CONTRATO_API.md`; necesario para rechazar, por ejemplo, completar una orden ya `completada`/`cancelada` (mismo criterio que `apartado_estado_invalido`/`transicion_estado_invalida` en otros módulos). |
| 422 | `stock_insumos_insuficiente` (si `cantidad_producida` excede lo que el stock de insumos permite al momento de completar) |

Al pasar a `completada`: deduce insumos FEFO de `insumo_stocks`, incrementa `inventario_stock` de
la variante destino (`InventarioService::ajustarStock()`, consumido desde el Service de
Producción — permitido, ver `01_ARQUITECTURA_BASE.md` — Producción no está en la lista de
módulos con dirección de dependencia restringida de CLAUDE.md §1 porque es un módulo nuevo; el
Orquestador debe agregarlo al mapa de dependencias formal antes de cerrar el diseño).

#### `POST /api/transformaciones`
**Permiso:** `produccion.transformar`
```json
{
  "sucursal_id": 1, "variante_origen_id": 10, "variante_destino_id": 11,
  "cantidad_origen": 1, "cantidad_destino": 8, "notas": "Torta entera a porciones"
}
```
| Campo | Validación |
|---|---|
| `sucursal_id` | `required, integer, exists:sucursales,id` |
| `variante_origen_id` | `required, integer,` tenant-scoped `exists:producto_variantes,id` |
| `variante_destino_id` | `required, integer, different:variante_origen_id,` tenant-scoped `exists` |
| `cantidad_origen` | `required, numeric, min:0.01` |
| `cantidad_destino` | `required, numeric, min:0.01` |

| Código | error_code |
|---|---|
| 422 | `stock_insuficiente` (reusa Núcleo, sobre la variante origen) |

---

## 11. Módulo: Ventas a Plazos (Installment)

**Namespace de permisos:** `ventas_plazos.ver`, `ventas_plazos.crear`, `ventas_plazos.pagar`
**[NUEVO — ver §0.3]**. Vive dentro de `Crm` (`VentasPlazosService`, extiende
`planes_pago_cliente`). **Sin feature gate.**

#### `POST /api/ventas/{venta}/plan-pago`
**Permiso:** `ventas_plazos.crear`
```json
{ "numero_cuotas": 6, "tasa_interes": 5.0, "periodicidad": "mensual", "fecha_inicio": "2026-08-01" }
```
| Campo | Validación |
|---|---|
| `numero_cuotas` | `required, integer, min:2, max:36` |
| `tasa_interes` | `nullable, numeric, min:0, max:100` |
| `periodicidad` | `required,` `Rule::in(['semanal','quincenal','mensual'])` |
| `fecha_inicio` | `required, date, after_or_equal:today` |

Cálculo (`03_ESPECIFICACION_BACKEND.md` §12):
`interes_total = venta.total * (tasa_interes/100)`; capital y interés por cuota se distribuyen
en partes iguales; `venta_id` se guarda en `planes_pago_cliente`.

| Código | error_code |
|---|---|
| 422 | `venta_ya_tiene_plan` |
| 422 | `numero_cuotas_invalido` |

**Response 201:** `PlanPagoClienteResource` con `cuotas` (id, numero, monto_capital,
monto_interes, monto_total_cuota, fecha_vencimiento, fecha_pago_real).

#### `GET /api/planes-pago-cliente/{planPagoCliente}`
**Permiso:** `ventas_plazos.ver` — detalle + cuotas.
```json
{
  "data": {
    "id": 1, "venta_id": 88, "cliente": { "id": 5, "nombre": "Juan Pérez" },
    "numero_cuotas": 6, "tasa_interes": 5.0, "interes_total": 87.50,
    "monto_total": 1837.50, "periodicidad": "mensual", "estado": "activo",
    "cuotas": [{
      "id": 3, "numero": 3, "monto_capital": 291.67, "monto_interes": 14.58,
      "monto_total": 306.25, "fecha_vencimiento": "2026-10-01", "fecha_pago_real": null
    }]
  },
  "meta": { "permisos": { "pagar_cuota": true } }
}
```

#### `POST /api/planes-pago-cliente/{planPagoCliente}/pagar-cuota`
**Permiso:** `ventas_plazos.pagar`
```json
{ "cuota_id": 3, "caja_sesion_id": 5, "metodo_pago_id": 1, "monto": 306.25 }
```
| Campo | Validación |
|---|---|
| `cuota_id` | `required, integer` — la cuota debe pertenecer a **este** `planPagoCliente` (validado en el Service, `Rule::exists` no anida FKs de dos niveles — ver §1.5) |
| `caja_sesion_id` | `required, integer, exists:caja_sesiones,id` |
| `metodo_pago_id` | `required, integer,` tenant-scoped `exists:metodos_pago,id` |
| `monto` | `required, numeric, min:0.01` |

| Código | error_code |
|---|---|
| 422 | `cuota_ya_pagada` **[NUEVO]** — `fecha_pago_real` ya no es null. No estaba en el catálogo de `02_CONTRATO_API.md` pese a ser el chequeo obvio antes de marcar el pago. |
| 422 | `monto_no_coincide_cuota` **[NUEVO]** — `monto != cuota.monto_capital + cuota.monto_interes`. El esquema no tiene "saldo parcial" por cuota (a diferencia de `cuentas_cobrar`), así que un pago parcial no tiene dónde guardarse; se exige monto exacto en vez de aceptarlo silenciosamente mal. Si el Orquestador prefiere permitir pagos parciales de cuota, el modelo de datos necesita una columna `saldo_pendiente` en `planes_pago_cliente_cuotas` que hoy no existe. |

---

## 12. Módulo: Payroll / Nómina

**Namespace de permisos:** `payroll.ver`, `payroll.crear`, `payroll.pagar`. **Sin feature gate**
(módulo admin, gateado solo por permiso).

#### `GET /api/empleados`
**Permiso:** `payroll.ver` · Query: `filtro_sucursal_id`, `filtro_activo`.
```json
{
  "data": [{
    "id": 1, "usuario": { "id": 15, "nombre": "Carlos Ruiz" }, "sucursal_id": 1,
    "salario_base": 8000.00, "tipo_salario": "fijo", "fecha_ingreso": "2025-01-15", "activo": true
  }],
  "meta": { "total": 4, "permisos": { "crear": true } }
}
```

#### `POST /api/empleados`
**Permiso:** `payroll.crear`
```json
{ "usuario_id": 15, "sucursal_id": 1, "salario_base": 8000.00, "tipo_salario": "fijo", "fecha_ingreso": "2025-01-15" }
```
| Campo | Validación |
|---|---|
| `usuario_id` | `required, integer,` tenant-scoped `exists:usuarios,id,` `Rule::unique('empleados','usuario_id')` |
| `sucursal_id` | `required, integer, exists:sucursales,id` |
| `salario_base` | `required, numeric, min:0` |
| `tipo_salario` | `required,` `Rule::in(['fijo','por_hora'])` |
| `fecha_ingreso` | `nullable, date` |

| Código | error_code |
|---|---|
| 422 | `empleado_ya_existe` |

#### `GET /api/nominas`
**Permiso:** `payroll.ver` · Query: `filtro_sucursal_id`, `filtro_estado`.

#### `POST /api/nominas/generar`
**Permiso:** `payroll.crear`
```json
{ "sucursal_id": 1, "periodo_inicio": "2026-07-01", "periodo_fin": "2026-07-15" }
```
| Campo | Validación |
|---|---|
| `sucursal_id` | `required, integer, exists:sucursales,id` |
| `periodo_inicio` | `required, date` |
| `periodo_fin` | `required, date, after:periodo_inicio` |

Calcula percepciones/deducciones para todos los empleados activos de la sucursal
(`03_ESPECIFICACION_BACKEND.md` §13). **Response 201:** `NominaResource` con `detalles`.

#### `PATCH /api/nominas/{nomina}/pagar`
**Permiso:** `payroll.pagar`
```json
{ "caja_sesion_id": 5 }
```
| Código | error_code |
|---|---|
| 422 | `nomina_ya_pagada` |

---

## 13. Módulo: Préstamos (Loans)

**Namespace de permisos:** `prestamos.ver`, `prestamos.crear`, `prestamos.pagar`. **Sin
feature gate.**

#### `GET /api/prestamos`
**Permiso:** `prestamos.ver` · Query: `filtro_estado` (`activo`\|`pagado`\|`cancelado`),
`filtro_proveedor_id`.
```json
{
  "data": [{
    "id": 1, "proveedor": { "id": 3, "nombre": "Distribuidora XYZ" }, "referencia": null,
    "monto": 50000.00, "interes": 8.5, "monto_a_pagar": 54250.00, "saldo_pendiente": 44250.00,
    "fecha_prestamo": "2026-06-01", "fecha_vencimiento": "2027-06-01", "estado": "activo"
  }],
  "meta": { "total": 2, "permisos": { "crear": true, "pagar": true } }
}
```

#### `POST /api/prestamos`
**Permiso:** `prestamos.crear`
```json
{
  "proveedor_id": 3, "monto": 50000.00, "interes": 8.5,
  "fecha_prestamo": "2026-06-01", "fecha_vencimiento": "2027-06-01", "notas": "..."
}
```
| Campo | Validación |
|---|---|
| `proveedor_id` | `nullable, integer,` tenant-scoped `exists:proveedores,id` (`referencia` cubre el caso de un prestamista que no es proveedor registrado) |
| `referencia` | `nullable, string, max:100` |
| `monto` | `required, numeric, min:0.01` |
| `interes` | `nullable, numeric, min:0, max:100` (default 0) |
| `fecha_prestamo` | `required, date` |
| `fecha_vencimiento` | `nullable, date, after:fecha_prestamo` |

`monto_a_pagar = monto * (1 + interes/100)`, `saldo_pendiente = monto_a_pagar`,
`estado = 'activo'`.

#### `GET /api/prestamos/{prestamo}`
**Permiso:** `prestamos.ver` — detalle + `pagos`.

#### `POST /api/prestamos/{prestamo}/pagos`
**Permiso:** `prestamos.pagar`
```json
{ "caja_sesion_id": 5, "monto": 10000.00, "notas": "Primer pago" }
```
`prestamo_pagos` no tiene `metodo_pago_id` en el esquema de `01_ARQUITECTURA_BASE.md` (ver
hallazgo §0.4) — se asume efectivo/salida directa de caja vía `caja_sesion_id`, sin selector de
método de pago en el frontend para este endpoint específicamente.

| Código | error_code |
|---|---|
| 422 | `pago_excede_saldo` |
| 422 | `prestamo_ya_pagado` |

---

## 14. Extensiones a endpoints existentes (orquestación en Controller, nunca en Service)

> **Histórico.** La numeración de "instancias" de esta sección se retiró en C11 (2026-10-30):
> la orquestación entre módulos vive ahora en Actions de `backend/app/Aplicacion/` (ARQ-03).
> Ver la tabla de Actions en `backend/README.md`. Los contratos HTTP de abajo no cambiaron.

Cada una cita las 3 instancias ya documentadas en CLAUDE.md §2 y se agrega como instancia nueva,
tal como exige la regla ("el docblock del método la documenta citando las 3 anteriores"). Ver
hallazgo §0.6 sobre por qué no se apilan todas dentro de `VentaController::store()` salvo estas.

### 14.1 `POST /api/ventas` — extensión para crédito (instancia #4)
**Permiso adicional:** `cuentas_cobrar.crear` (se exige junto con `ventas.crear` si `tipo_pago = credito`).

Campos nuevos en el body existente:
```json
{ "...campos_actuales_de_venta...", "tipo_pago": "credito", "dias_credito": 30 }
```
| Campo | Validación |
|---|---|
| `tipo_pago` | `nullable,` `Rule::in(['contado','credito'])` (default `contado` — no rompe el contrato actual) |
| `dias_credito` | `required_if:tipo_pago,credito, integer, min:1, max:180` |

Cuando `tipo_pago = credito`: `pagos` puede venir vacío o parcial (anticipo); el Controller
crea la `Venta` (`VentaService::registrarVenta()`, sin tocar el Service) y luego, en el mismo
`DB::transaction`, llama a `CuentasCobrarService::crearDesdeVenta($venta, $diasCredito)`.
`VentaResource` en la respuesta agrega `cuenta_cobrar: { id, saldo_pendiente }` cuando aplica.

### 14.2 `POST /api/compras` — extensión para crédito (instancia #5)
**Permiso adicional:** `cuentas_pagar.registrar_pago` no aplica aquí — se exige `compras.crear`
igual que hoy; la creación de CxP no necesita permiso extra porque ya está detrás de
`compras.crear`.

Campos nuevos: `tipo_pago` (`contado`\|`credito`), `dias_credito` — mismo shape que 14.1.
`CompraController::store()` orquesta `CuentasPagarService::crearDesdeCompra()`.

### 14.3 `PATCH /api/pedidos/{pedido}/estado` — generación de venta al entregar (instancia #6)
Ya cubierto en §6 — al pasar a `entregado` sin `venta_id`, el `PedidoController` (no el Service)
llama a `VentaService::registrarVenta()` con los `pedido_items` como líneas.

### 14.4 `POST /api/devoluciones` — nota de crédito (instancia #7)
Campo nuevo: `tipo_reembolso` (`efectivo`\|`nota_credito`, default `efectivo`). Cuando es
`nota_credito`, `DevolucionController::store()` orquesta `NotaCreditoService::crearDesdeDevolucion()`
dentro de la misma transacción. `DevolucionResource` agrega `nota_credito: { id, monto_original }`
cuando aplica.

### 14.5 `POST /api/ventas` y `POST /api/apartados/{id}/abonos` — pago con Gift Card / Nota de Crédito
No son campos nuevos en el body — Gift Card y Nota de Crédito se registran como un
`metodo_pago_id` más (`tipo = 'digital'`, seed en `01_ARQUITECTURA_BASE.md` §14) dentro del
array `pagos` ya existente, salvo que el monto a descontar necesita resolver **qué** gift
card/nota (no solo el método). Se agrega un campo opcional por línea de pago:
```json
{ "pagos": [{ "metodo_pago_id": 9, "monto": 200.00, "gift_card_codigo": "GC-3-A1B2C3D4" }] }
```
o `nota_credito_id` en vez de `gift_card_codigo` cuando el método es Nota de Crédito.

| Código | error_code |
|---|---|
| 422 | `gift_card_saldo_insuficiente` **[NUEVO]** — no estaba en el catálogo; `03_ESPECIFICACION_BACKEND.md` §7 solo cubre expirada/cancelada como bloqueos de *recarga*, no el caso de "saldo no alcanza para el monto del pago" al usarla como forma de pago. |
| 422 | `nota_credito_sin_saldo` (ya en el catálogo) |
| 422 | `nota_credito_expirada` (ya en el catálogo) |
| 422 | `gift_card_expirada` / `gift_card_cancelada` (reusa los de §7) |

### 14.6 `PUT /api/configuracion` — `modulos_activos`
Campo nuevo en el body existente de `ConfiguracionController::update()`:
```json
{ "...campos_actuales...", "modulos_activos": ["cxc", "cxp", "cotizaciones"] }
```
| Campo | Validación |
|---|---|
| `modulos_activos` | `nullable, array,` `Rule::in(['cxc','cxp','cotizaciones','delivery','gift_cards','crm_avanzado'])` por elemento |

`ConfiguracionTenantResource` (hoy no expone el campo — ver lectura del archivo real) necesita
agregar `'modulos_activos' => $this->modulos_activos ?? []`.

---

## 15. Reportes Nuevos

**Permiso base:** `reportes.*` (ya sembrado: `reportes.cuentas_cobrar`, `reportes.cuentas_pagar`,
`reportes.crm`). Sin paginación (son agregados, no listados de filas) — mismo criterio que
`InicioController::resumen()`.

#### `GET /api/reportes/cuentas-cobrar`
**Permiso:** `reportes.cuentas_cobrar`
```json
{
  "data": {
    "total_pendiente": 45000.00, "total_vencido": 8000.00,
    "por_cliente": [{ "cliente": { "id": 5, "nombre": "Juan Pérez" }, "saldo_pendiente": 1500.00, "cuentas_vencidas": 1 }],
    "antiguedad_saldos": { "0_30": 20000.00, "31_60": 15000.00, "61_90": 8000.00, "mas_90": 2000.00 }
  }
}
```

#### `GET /api/reportes/cuentas-pagar`
**Permiso:** `reportes.cuentas_pagar` — mismo shape, `por_proveedor` en vez de `por_cliente`.

#### `GET /api/reportes/crm`
**Permiso:** `reportes.crm`
```json
{
  "data": {
    "clientes_por_segmento": { "nuevo": 40, "frecuente": 25, "vip": 8, "inactivo": 12 },
    "puntos_loyalty_emitidos": 15400, "puntos_loyalty_canjeados": 3200
  }
}
```

---

## 16. Catálogo consolidado de `error_code` nuevos

Extiende la tabla de `02_CONTRATO_API.md` §15 — los marcados `[NUEVO]` no estaban en el original.
La fuente vigente es `docs/estandares/catalogo_error_code.md`, generado con
`php artisan errores:catalogo` (API-03, API-04); donde difiera de esta tabla, gana el catálogo.

| error_code | HTTP | Módulo |
|---|---|---|
| `modulo_no_activo` | 403 | Global |
| `abono_excede_saldo` | 422 | CxC |
| `cuenta_ya_pagada` | 422 | CxC |
| `cuenta_anulada` | 422 | CxC |
| `cuenta_con_abonos` | 422 | CxC |
| `cuenta_pagar_ya_pagada` | 422 | CxP |
| `cuenta_pagar_anulada` | 422 | CxP |
| `cuenta_pagar_con_abonos` | 422 | CxP |
| `pago_excede_saldo` | 422 | CxP, Préstamos |
| `cotizacion_no_editable` | 422 | Cotizaciones |
| `cotizacion_no_anulable` | 422 | Cotizaciones |
| `cotizacion_vencida` | 422 | Cotizaciones |
| `cotizacion_ya_convertida` | 422 | Cotizaciones |
| `sin_cliente` | 422 | Cotizaciones |
| `transicion_estado_invalida` | 422 | Delivery |
| `repartidor_no_existe` | 422 | Delivery |
| `repartidor_no_activo` | 422 | Delivery |
| `pedido_sin_items_para_venta` | 422 | Delivery | **[NUEVO]** |
| `monto_invalido` | 422 | Gift Cards |
| `gift_card_expirada` | 422 | Gift Cards |
| `gift_card_cancelada` | 422 | Gift Cards |
| `gift_card_saldo_insuficiente` | 422 | Gift Cards / TPV | **[NUEVO]** |
| `nota_credito_expirada` | 422 | Notas Crédito |
| `nota_credito_sin_saldo` | 422 | Notas Crédito |
| `puntos_insuficientes` | 422 | CRM Avanzado / Loyalty | **[NUEVO]** |
| `unidad_en_uso` | 422 | Unidades Medida |
| `stock_insumos_insuficiente` | 422 | Producción |
| `orden_produccion_estado_invalido` | 422 | Producción | **[NUEVO]** |
| `venta_ya_tiene_plan` | 422 | Ventas a Plazos |
| `numero_cuotas_invalido` | 422 | Ventas a Plazos |
| `cuota_ya_pagada` | 422 | Ventas a Plazos | **[NUEVO]** |
| `monto_no_coincide_cuota` | 422 | Ventas a Plazos | **[NUEVO]** |
| `empleado_ya_existe` | 422 | Payroll |
| `nomina_ya_pagada` | 422 | Payroll |
| `prestamo_ya_pagado` | 422 | Préstamos |

---

## 17. Catálogo consolidado de permisos nuevos

Resuelve el conflicto del hallazgo §0.3 — este es el catálogo final a sembrar en
`NucleoRolesPermisosSeeder::PERMISOS`, reemplazando tanto `01_ARQUITECTURA_BASE.md` §15 como
`03_ESPECIFICACION_BACKEND.md` §16 donde divergían:

```php
// CxC
'cuentas_cobrar.ver', 'cuentas_cobrar.crear', 'cuentas_cobrar.registrar_abono', 'cuentas_cobrar.anular',
// CxP
'cuentas_pagar.ver', 'cuentas_pagar.registrar_pago',
// Cotizaciones
'cotizaciones.ver', 'cotizaciones.crear', 'cotizaciones.editar', 'cotizaciones.eliminar', 'cotizaciones.convertir',
// Delivery
'pedidos.ver', 'pedidos.crear', 'pedidos.cambiar_estado', 'pedidos.asignar_repartidor',
// Gift Cards
'gift_cards.ver', 'gift_cards.emitir', 'gift_cards.recargar', 'gift_cards.cancelar',
// Notas de Crédito
'notas_credito.ver',
// CRM Avanzado
'crm.interacciones.ver', 'crm.interacciones.crear', 'crm.campanas.enviar',
'loyalty.ver', 'loyalty.ajustar',
// Reportes
'reportes.cuentas_cobrar', 'reportes.cuentas_pagar', 'reportes.crm',
// Unidades de Medida — SIN permiso propio; GET abierto, mutaciones bajo inventario.*
// Producción — namespace propio (corrige 02_CONTRATO_API.md que decía "reusa inventario.*")
'produccion.ver', 'produccion.crear', 'produccion.editar', 'produccion.completar', 'produccion.transformar',
// Ventas a Plazos — namespace propio (corrige 02_CONTRATO_API.md que decía "reusa clientes.*")
'ventas_plazos.ver', 'ventas_plazos.crear', 'ventas_plazos.pagar',
// Payroll
'payroll.ver', 'payroll.crear', 'payroll.pagar',
// Préstamos
'prestamos.ver', 'prestamos.crear', 'prestamos.pagar',
```

---

*Fin de API_SPECIFICATION.md*
