# Estándares de Nianva POS

> **Estado:** APROBADO, 2026-10-30. Manda sobre `.claude/CLAUDE.md` y los documentos previos;
> el código se alinea en el saneamiento de la Fase 1 (C1-C11).

## Para qué existen

Nianva POS será **un solo código** para varios giros (ropa, zapatería, abarrotes con granel,
papelería…), con módulos especiales (Agenda para barbería y belleza), versiones con distinto
precio (Lite, Pro, Full) y varios entornos (escritorio monocaja, LAN multi-tienda, servidor
propio o rentado, SaaS).

En Nianva POS Lite, cada regla de este documento ya se rompió al menos una vez, y el arreglo
costó un parche vista por vista. Por eso aquí cada regla dice:

- **Regla**: qué se hace o qué está prohibido.
- **Por qué**: la falla real que la motivó (L-xx, ver la [tabla de lecciones](#lecciones-de-origen)).
- **Cómo se verifica**: test, lint, CI o revisión. Una regla sin verificación es un deseo.
- **Desde**: la fase del plan en que empieza a exigirse.

## Índice

| Archivo | Prefijo | Contenido |
|---|---|---|
| [01_arquitectura.md](01_arquitectura.md) | ARQ | Capas, módulos, features por plan, giros, estructura Nx |
| [02_datos.md](02_datos.md) | DAT | Cantidades, dinero, fotos por línea, libros, folios, migraciones |
| [03_seguridad.md](03_seguridad.md) | SEG | Tenant y sucursal, permisos, XSS, autorizaciones de supervisor, respaldos |
| [04_api.md](04_api.md) | API | `/api/v1`, sobres de respuesta, errores, paginación, idempotencia |
| [05_ui_sistema_diseno.md](05_ui_sistema_diseno.md) | UI | Tokens, temas, componentes, plantillas de pantalla y de reporte, impresos |
| [06_proceso_y_calidad.md](06_proceso_y_calidad.md) | PRO | Tests, líneas base, encargos a DS, revisión y checklist de cierre |

## Jerarquía

1. **Estos estándares.**
2. Las instrucciones para agentes (`.claude/CLAUDE.md`), que deben resumirlos sin contradecirlos.
3. Los documentos anteriores de `docs/`, como `MANUAL_TECNICO.md`, `nucleo_arquitectura.md`,
   `01`-`04_*.md`, `API_SPECIFICATION.md` y `consideraciones_futuras.md`. Siguen siendo
   referencia de **por qué** se construyó lo que hay; donde contradigan un estándar, gana el
   estándar y el documento se corrige en la Fase 1.

## Cómo se cambia un estándar

- Solo por decisión explícita del responsable.
- El cambio se hace en el archivo, con una línea en la [bitácora de cambios](#bitácora-de-cambios)
  (fecha, ID, motivo).
- Una excepción puntual se anota en el estándar afectado (sección "Excepciones") con fecha,
  alcance y motivo. Ninguna excepción se infiere de código existente.
- **Prohibido** relajar un estándar para que pase un cambio. Si la regla estorba, se discute
  primero.

## Glosario

| Término | Significado |
|---|---|
| **Tenant** | Un negocio cliente. En SaaS comparte la BD con otros (`tenant_id`); en local hay uno solo. |
| **Sucursal** | Una tienda del tenant. También es el almacén. |
| **Terminal** | Una caja física (equipo) dentro de una sucursal. Abre sesiones de caja. |
| **Producto** | La ficha: nombre, categoría, impuestos, unidad base, precio y costo por defecto. |
| **Variante (SKU)** | Lo que se vende y se cuenta. Todo producto tiene al menos una. Puede tener precio y costo propios; si no, hereda los del producto. |
| **Atributo** | Dimensión de la variante definida por el giro (talla, color, número, sabor, presentación…). |
| **Presentación** | Forma de venta o compra con factor sobre la unidad base (caja de 12 = 12 pza). |
| **Granel** | Variante que se vende en cantidad decimal (kg, m, l). |
| **Foto de línea** | Copia inmutable en cada línea de documento de precio, costo, impuesto, descuento y regla aplicada al momento de la operación. |
| **Libro** | Tabla de movimientos de solo inserción con saldo antes y después (stock, crédito, caja). El saldo actual es una proyección del libro. |
| **Giro** | Perfil de negocio: atributos, unidades, categorías semilla, etiquetas y módulos sugeridos. Es configuración, no código. |
| **Plan** | Paquete comercial del tabulador (`LITE_MONOCAJA`, `PRO_*`, `FULL_*`, `SAAS_*`): features más límites. |
| **Feature** | Capacidad activable (`apartados`, `credito_clientes`, `agenda`…). La concede el plan y la puede apagar el tenant. |
| **DS** | El agente externo que implementa encargos a partir de un prompt. |

## Decisiones tomadas

Tomadas por el responsable el 2026-10-30.

| ID | Pregunta | Decisión | Regla |
|---|---|---|---|
| D1 | Identificador público de las tablas transaccionales | `id` bigint interno más `ulid` público | DAT-08 |
| D2 | Política de costo del inventario | Costo promedio ponderado por variante y sucursal, más el último costo guardado como dato informativo. El que se usa en la foto de la línea es el promedio | DAT-15 |
| D3 | Precisión de las cantidades | `decimal(14,3)` (gramos o mililitros); subir a 4 solo si algún giro lo pide | DAT-01 |
| D4 | Dónde se declara el `error_code` de una excepción de negocio | En cada excepción, con un manejador genérico en `bootstrap/app.php` en lugar del mapa central (C1) | API-04 |
| D5 | Dónde vive la orquestación entre módulos | En Actions de aplicación; se retira la lista de "orquestación en Controller" (C11) | ARQ-03 |

## Conflictos con lo existente (se resuelven en el saneamiento de la Fase 1)

| # | Hoy en Pro | Dónde | Estándar | Acción en Fase 1 |
|---|---|---|---|---|
| C1 | Las excepciones de negocio se mapean a `error_code` en un bloque central (95 menciones) | `backend/bootstrap/app.php`; `.claude/CLAUDE.md` §3 | API-04 | **Resuelto el 2026-10-30.** Cada excepción extiende `ExcepcionNegocio` y declara su `error_code`; `bootstrap/app.php` solo registra el manejador genérico. Catálogo en [catalogo_error_code.md](catalogo_error_code.md) |
| C2 | Las Policies existen, pero ningún controlador llama `authorize()` | `.claude/CLAUDE.md` §3; búsqueda de `authorize(` sin resultados en `backend/app` | SEG-03 | **Resuelto el 2026-10-30.** Decisión del responsable: el middleware `permiso:*` es la única autoridad y las Policies se retiran. Tests `RutasConPermisoTest` y `MatrizPermisosTest` |
| C3 | Algunos endpoints aceptan `sucursal_id` del request (`ProductoVarianteController::store`, `VentaController::store`) | `docs/consideraciones_futuras.md` (sección "`sucursal_id` aceptado como campo de request…") | SEG-02 | **Resuelto el 2026-10-30.** `Nucleo/Support/SucursalOperacion` (permiso `sucursales.todas`) en cotizaciones, pedidos, stock de insumos, nóminas y reporte de ventas; test `SucursalDelContextoTest`. La terminal se suma en la Fase 4 |
| C4 | `codigo_barras` es `UNIQUE` global | `Inventario/Database/Migrations/2026_07_21_000005_create_producto_variantes_table.php:16`; `ProductoVarianteController:67,84` | DAT-09 | **Resuelto el 2026-10-30.** `producto_variantes` con `tenant_id` propio, `UNIQUE (tenant_id, codigo_barras)` y validación con scope; test de esquema `UnicidadConTenantTest` |
| C5 | Rutas sin versión (`/api/...`) | `backend/routes/api.php`, `bootstrap/app.php` | API-01 | Prefijo `/api/v1` y el frontend con la base URL desde la configuración |
| C6 | Cantidades `int` y variantes fijas `talla`/`color` | `ProductoVariante.php:15` (Fillable) y migraciones de Inventario | DAT-01, ARQ-07 | Se reescriben en la Fase 3 (esquema nuevo, no `add_*`) |
| C7 | `#[Fillable]` desincronizado descarta campos sin avisar | `docs/consideraciones_futuras.md` ("Auditar… `#[Fillable]` desincronizado") | DAT-14 | **Resuelto el 2026-10-30.** `preventSilentlyDiscardingAttributes`, `preventLazyLoading` y `preventAccessingMissingAttributes` fuera de producción; test `ModelosEstrictosTest` |
| C8 | Validación en el controlador (`$request->validate`) | p. ej. `ConfiguracionController.php:49` | ARQ-02 | **Resuelto el 2026-10-30**, en 5 lotes: ningún controller valida en línea (`EntradasTipadasTest`, sin pendientes). Fuera: el middleware `RequiereDosFactorReciente`, y los Services, que aún reciben arreglos |
| C9 | Medición del 2026-10-30: backend 296/296 en verde; frontend 419/420, con 1 fallo por *timeout* de 5 s en `ventas-list.component.spec.ts` ("anular pide un motivo…"), probablemente intermitente bajo carga. No hay CI que lo exija | Suites backend y frontend | PRO-02 | Estabilizar ese spec y montar CI bloqueante con ambas suites |
| C10 | Estilos por vista (111 SCSS), sin modo oscuro y montos sin formato | `frontend/apps/**` | UI-01 a UI-06 | Se regeneran las pantallas sobre `libs/ui/*` (Fase 2) |
| C11 | Excepción "orquestación en Controller" con instancias numeradas | `.claude/CLAUDE.md` §2; `API_SPECIFICATION.md` §14 | ARQ-03 | **Resuelto el 2026-10-30.** Cuatro Actions en `app/Aplicacion/`; la lista de excepciones se retiró. Grafo verificado por `DependenciasEntreModulosTest` (las extensiones dependen solo de los módulos base) |

## Lecciones de origen

Cada lección es un hecho ocurrido. Las de Lite tienen el commit o el archivo; las de Pro, el documento o el hallazgo.

| ID | Qué pasó | Reglas que lo evitan |
|---|---|---|
| L-01 | XSS: el TPV de Lite armaba HTML con `innerHTML` y nombres de producto sin escapar | SEG-04, UI-15 |
| L-02 | `escapeAttr()` se usaba en el carrito sin estar definida; reventaba al aplicar "3 por $X" | PRO-05, ARQ-08 |
| L-03 | IDOR: el kardex, `buscarTicket`, el detalle de venta y la ficha de cliente aceptaban ids o `sucursal_id` de otra sucursal | SEG-01, SEG-02 |
| L-04 | `CreditoCliente::abonar` usaba `FOR UPDATE` sin transacción; un doble clic podía duplicar el abono | ARQ-04, API-07 |
| L-05 | La clave de admin del TPV no tenía límite de intentos | SEG-05 |
| L-06 | Los cambios de devolución guardaban `costo_unitario = 0` por un `?? 0`; un commit decía haberlo corregido | DAT-03, PRO-04 |
| L-07 | `Compra` escribía kardex aunque el `UPDATE` de stock no tocara ninguna fila | DAT-04 |
| L-08 | Kardex sin carga inicial: hubo que reconstruir el saldo de apertura desde el stock actual | DAT-05 |
| L-09 | Doble codificación UTF-8 en 265 filas | DAT-12 |
| L-10 | Ventas viejas sin costo congelado: la utilidad histórica cambiaba al editar el costo | DAT-03 |
| L-11 | La rotación del token CSRF en cada POST rompía las impresiones en iframe | SEG-06 |
| L-12 | Respaldos guardados dentro del docroot, descargables | SEG-08 |
| L-13 | La validación del SQL a restaurar era frágil (comentarios, cadenas, `/*! */`) | DAT-13, SEG-08 |
| L-14 | Los tickets mostraban el nombre interno de la sucursal o la de la sesión, no la del documento | UI-12 |
| L-15 | Al guardar la configuración se borraba el perfil de giro por una variable indefinida | PRO-05, ARQ-02 |
| L-16 | JS que corría antes de existir el DOM dejaba botones sin efecto | UI-02 (componentes, no scripts sueltos) |
| L-17 | DS reescribió `BackupHelperTest` y se perdieron 11 tests | PRO-01, PRO-03 |
| L-18 | DS revirtió cambios de otra sesión (etiquetas) | PRO-06 |
| L-19 | Un parcial pisó la variable `$items` de la vista que lo incluía | UI-02 |
| L-20 | "Ventas netas" dejó de sumar los cambios en un reporte y en otro no | ARQ-09 |
| L-21 | Siete reportes con siete maquetaciones distintas; luego una plantilla | UI-10 |
| L-22 | 170 violaciones visuales (colores fijos, `bg-white`, modo oscuro parchado) | UI-01, UI-03, PRO-03 |
| L-23 | Cantidades crudas ("1.000") y el granel agregado tarde, sobre columnas `int` | DAT-01, UI-05 |
| L-24 | Variantes atadas a talla y color; textos fijos de ropa en vistas | ARQ-07 |
| L-25 | El precio por variante era imposible sin tocar unos 19 archivos que leían `precio_venta` directo | ARQ-05 |
| L-26 | Promociones, mayoreo, "N por $X" y cupones con reglas separadas, sin prioridad ni combinación | ARQ-05 |
| L-27 | Cada cambio de esquema se escribía en tres lugares más una bandera de sesión | DAT-11 |
| L-28 | La misma pantalla con nombres distintos en el menú, el título y el botón que la abre | UI-08 |
| L-29 | Reportes visibles para roles que no debían verlos | SEG-03 |
| L-30 | Los códigos de barras del cliente no se pueden cambiar nunca; en Pro el `UNIQUE` global impide SaaS | DAT-09 |
| L-31 | Pro: `sucursal_id` del request y Policies sin conectar | SEG-02, SEG-03 |
| L-32 | Pro: `#[Fillable]` desincronizado descartó campos en silencio; sin CI, nada impide subir con la suite en rojo | DAT-14, PRO-02 |

## Bitácora de cambios

| Fecha | ID | Cambio |
|---|---|---|
| 2026-10-29 | — | Borrador inicial |
| 2026-10-30 | D1-D5 | La tabla de decisiones abiertas pasa de `02_datos` a este README y suma D4 (API-04) y D5 (ARQ-03), que quedan como propuesta |
| 2026-10-30 | DAT-01, DAT-03 | DAT-01 señala la precisión como decisión abierta D3, y DAT-03 remite el costo unitario a D2 |
| 2026-10-30 | D1-D5 | Decisiones tomadas por el responsable; nueva DAT-15 (costo promedio ponderado) |
| 2026-10-30 | — | Estándares aprobados |
| 2026-10-30 | C1 | Resuelto: `ExcepcionNegocio`, manejador genérico y catálogo generado. Los códigos de CxP pasan a `cuenta_pagar_*` para no repetir los de CxC |
| 2026-10-30 | C4 | Resuelto: unicidad con tenant en código de barras, `insumos.sku` y `gift_cards.codigo` |
| 2026-10-30 | C11 | Resuelto: Actions de aplicación. Decisión del responsable: los módulos de extensión pueden depender de los módulos base, nunca entre sí |
| 2026-10-30 | C7 | Resuelto: modelos estrictos fuera de producción (DAT-14) |
| 2026-10-30 | C2, SEG-03, ARQ-01 | Resuelto: el permiso se verifica solo con el middleware `permiso:*`; se retiran las Policies y SEG-03 y ARQ-01 dejan de mencionarlas |
| 2026-10-30 | C3 | Resuelto: la sucursal sale del usuario; otra solo con `sucursales.todas` y del mismo tenant |
| 2026-10-30 | C8, ARQ-02 | Lote 1: base `SolicitudNegocio`, DTOs en `Modules/<Modulo>/Dtos/` y `EntradasTipadasTest`. ARQ-02 nombra la clase base y el test |
| 2026-10-30 | C8 | Lote 2: Inventario, Precios y Crm. Las ediciones parciales conservan la diferencia entre campo ausente y null (`camposPresentes()`) |
| 2026-10-30 | C8, SEG-02 | Lote 3: extensiones activas. La sucursal se resuelve con `SucursalOperacion` en el `toDto()` del FormRequest; `SucursalDelContextoTest` también revisa `Http/Requests` |
| 2026-10-30 | SEG-12 | Nueva, aprobada por el responsable: PIN de caja para desbloqueo de pantalla (del lado del servidor) y autorización de supervisor; sin login rápido ni cambio de usuario con PIN. Base: `docs/REPORTE_PIN_LITE.md` |
| 2026-10-30 | C8, ARQ-02 | Lote 4: Núcleo (incluida la autenticación), Auditoría y Configuración. ARQ-02 permite sobrescribir `authorize()` solo para guardas del recurso que responden antes de validar, con `abort()` |
| 2026-10-30 | C8 | Resuelto con el lote 5 (módulos congelados): `PENDIENTES` de `EntradasTipadasTest` queda vacía |
