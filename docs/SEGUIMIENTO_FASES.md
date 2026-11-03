# Seguimiento por regla y fase

Cruza cada regla de los [estándares](estandares/README.md) con su fase y su estado. El
historial de cada encargo está en [CONTEXTO_MIGRACION.md](CONTEXTO_MIGRACION.md) §5.

**Cómo se usa:**

- cada encargo actualiza en su PR las filas que toca;
- una fila pasa a **Hecho** solo cuando existe el test o la guarda de CI que pide el
  "Verifica" de la regla, y esta tabla la nombra;
- una fase se cierra solo cuando todas sus filas están en **Hecho**, o cuando el "Desde" de la
  regla se corrigió con la aprobación del responsable (con su entrada en la bitácora de los
  estándares);
- una regla con partes en varias fases aparece en cada una, con la parte que le toca.

**Estados:** Hecho · Parcial (existe parte del "Verifica") · Pendiente.

Revisado contra el repo el 2026-11-01.

## Fase 0

| Regla | Qué pide | Estado | Dónde se verifica | Encargo |
|---|---|---|---|---|
| PRO-04 | Un bug se corrige con su test primero | Hecho | Revisión del PR (un `fix` sin test se rechaza) | — |

## Fase 1: saneamiento

**Cerrada el 2026-11-02**: sus 35 filas están en Hecho. La deuda que queda vive en listas de
pendientes que solo bajan (`sin-strict-types.txt`, `PENDIENTES` de
`ControllersSinConsultasTest`, `RespuestasConResourceTest` y `ListadosUniformesTest`) y en la
línea base de PHPStan; se paga al tocar cada módulo.

| Regla | Qué pide | Estado | Dónde se verifica | Encargo |
|---|---|---|---|---|
| ARQ-01 | Capas fijas; controller sin consultas (código nuevo y tocado) | Hecho | `Arquitectura/ControllersSinConsultasTest` (`DB::`, `::query(`, `::where(`, `::whereIn(`, `->newQuery(`); 28 controllers en `PENDIENTES`, que solo bajan | 33 |
| ARQ-02 | Entradas tipadas: FormRequest + DTO | Hecho | `Arquitectura/EntradasTipadasTest`, PHPStan nivel 8 | C8 |
| ARQ-03 | Orquestación entre módulos en Actions | Hecho | `Arquitectura/DependenciasEntreModulosTest` | C11 |
| ARQ-06 | Middleware y convención de features | Hecho | `Arquitectura/RutasDeModulosOpcionalesTest` (11 módulos opcionales con su `modulo:<slug>`; `UnidadesMedida` exenta con razón) | 33 |
| ARQ-08 | Tipado estricto | Hecho | PHPStan nivel 8 con línea base que solo baja (CI); `Arquitectura/StrictTypesTest`: todo PHP nuevo con `strict_types`, existentes en `tests/Fixtures/sin-strict-types.txt` (594, solo baja) | 33 |
| ARQ-10 | Módulos congelados | Hecho | `.github/CODEOWNERS` | 28 |
| ARQ-13 | Configuración en tiempo de ejecución | Hecho | Paso de CI "Buscar URLs fijas en el frontend"; `core/runtime-config.spec.ts` | C5, 28 |
| DAT-06 | Zona horaria del tenant (configuración) | Hecho | Columna `configuracion_tenant.zona_horaria` (default `America/Mexico_City`, `timezone:all`); `Configuracion/ZonaHorariaTenantTest` | 30 |
| DAT-09 | Unicidad con tenant: código de barras | Hecho | `Arquitectura/UnicidadConTenantTest` | C4 |
| DAT-11 | Migraciones: una sola fuente | Hecho | Pasos de CI "Verificar rollback de migraciones en SQLite" y "Verificar snapshot del esquema" (`esquema:snapshot --check`); `Arquitectura/EsquemaSnapshotTest` contra `tests/Fixtures/esquema.json` (esquema SQLite) | 26, 30 |
| DAT-12 | UTF-8 de extremo a extremo | Hecho | Paso de CI "Revisar codificacion" (UTF-8 inválido, BOM, U+FFFD, `??`+letra, doble codificación `Ã…`/`Â…`); comando `conciliar:texto` (`Nucleo/ConciliarTextoCommandTest`). El test del importador, cuando exista un importador | 23, 33 |
| DAT-14 | Nada se descarta en silencio | Hecho | `Arquitectura/ModelosEstrictosTest` | C7 |
| API-01 | Versión en la ruta | Hecho | `Arquitectura/RutasVersionadasTest` | C5 |
| API-02 | Sobre de respuesta y `JsonResource` | Hecho | `Arquitectura/RespuestasConResourceTest`: 38 archivos y 90 `response()->json` en `PENDIENTES` (solo baja); `AuthController` exento por ser sesión web; detecta arreglos/modelos directos | 35, 36 |
| API-03 | Errores con `error_code` estable | Hecho | `Arquitectura/CatalogoErrorCodeTest`, `errores:catalogo --check`, `Arquitectura/ErroresSinDetallesInternosTest` (401/403/404/405/419/423/429/500 con `error_code`) | C1, 29 |
| API-04 | Cada excepción sabe responder | Hecho | `Arquitectura/BootstrapSinMapeoPorExcepcionTest`, `ManejadorExcepcionNegocioTest` | C1 |
| API-05 | Validación de entrada | Hecho | `Arquitectura/ExistenciasConTenantTest`; `Seguridad/ManipulacionDePreciosTest` (ventas, cotizar, apartados, devoluciones, compras); `Cotizaciones/CotizacionPrecioManualTest` (excepción con `cotizaciones.precio_manual`) | 32 |
| API-06 | Listados uniformes | Hecho | `Arquitectura/ListadosUniformesTest` (`meta`: `total`, `page`, `rows`, `filtros_aplicados`, `permisos`; `rows=500` ≤ 100; `q`, orden por defecto); helper `Nucleo/Support/Listado`; 25 listados en `PENDIENTES` (solo baja) | 36 |
| API-08 | Especificación OpenAPI generada y su diff en CI | Hecho | `docs/api/openapi.json` (OpenAPI 3.1.2, 117 rutas); `Arquitectura/EspecificacionOpenApiTest`; paso de CI "Verificar especificacion OpenAPI" con `scramble:export` y diff | 34 |
| SEG-01 | Scope de tenant y sucursal | Hecho | `Seguridad/AislamientoBindingTest` (60 rutas con binding contra otro tenant; rutas operativas, rutas con `{id}`, listados, kardex y gastos contra otra sucursal; `EXENTAS` con razón); scope `BelongsToSucursal` | 32b |
| SEG-02 | La sucursal viene del contexto | Hecho | `Arquitectura/SucursalDelContextoTest`, `Seguridad/SucursalEndpointsTest` | C3 |
| SEG-03 | Permisos conectados | Hecho | `Arquitectura/RutasConPermisoTest`, `Permisos/MatrizPermisosTest` (incluye rutas con binding) | C2, 27 |
| SEG-07 | Secretos | Hecho | Pasos de CI de gitleaks y de llaves privadas | 28 |
| SEG-08 | Archivos fuera del docroot: sin `/storage` público | Hecho | `Seguridad/StorageFueraDelDocrootTest` (404, `filesystems.links` vacío, sin disco `public` ni `Storage::url` en `app/`) | 29 |
| SEG-10 | Auditoría | Hecho | `Auditoria/OperacionesSensiblesTest` (éxito deja fila, fallo no; permisos y roles por pivote); `Nucleo/ResetearDosFactorCommandTest`; inventario por Kardex | 31, 32 |
| SEG-11 | Errores sin detalles internos | Hecho | `Arquitectura/ErroresSinDetallesInternosTest` (500 con `APP_DEBUG=false`, `RuntimeException` y `QueryException`; `correlation_id` en la respuesta, en la cabecera y en el log) | 29 |
| PRO-01 | Tests existentes no se reescriben | Hecho | Paso de CI "Verificar que no bajen los metodos de test"; CODEOWNERS | 23 |
| PRO-02 | Suite siempre en verde | Hecho | Jobs Backend y Frontend; paso "Buscar skip u only sin issue enlazada" | C9 |
| PRO-03 | Las líneas base solo bajan | Hecho | Paso "Verificar que la linea base de PHPStan no crezca"; CODEOWNERS | 7 |
| PRO-05 | Análisis estático bloqueante | Hecho | Pint, PHPStan, ESLint y `tsc` en CI; stylelint en la Fase 2 y el diff de OpenAPI con API-08 | 7 |
| PRO-06 | Un tema por encargo | Hecho | Revisión del diff; tests en SQLite en memoria por proceso | — |
| PRO-07 | Servicio compartido: re-correr consumidores | Hecho | CI corre la suite completa en cada PR | — |
| PRO-08 | Datos de prueba reproducibles | Hecho | Factories (`Factories/FactoriesConDatosDadosTest`); escenarios (`Seeders/EscenariosSeederTest` y paso de CI) | 26 |
| PRO-09 | Flujo de un encargo a DS | Hecho | Reporte con checklist y conteo, revisado contra el prompt | — |
| PRO-10 | Estrategia fuera del repo | Hecho | `.gitignore` y revisión de `git status` | — |

## Fase 2: sistema de diseño

| Regla | Qué pide | Estado | Dónde se verifica | Encargo |
|---|---|---|---|---|
| ARQ-11 | Capas de librerías Nx | Hecho | Etiquetas `type:*` en todos los proyectos; `@nx/enforce-module-boundaries` con `depConstraints` por capa (un `feature` no importa otro; un proyecto sin etiqueta falla) | 37 |
| ARQ-12 | Estado y efectos | Parcial | ESLint: sin `HttpClient` en `*.component.ts`; `erroresInterceptor` con su test: un toast ante errores técnicos (sin conexión, 403, 5xx) y `ERROR_EN_PANTALLA` para las pantallas que muestran su error. Faltan los 4xx de negocio en el interceptor (los componentes aún muestran sus propios toasts) y los servicios de `domain/*` con tipos del contrato | 37, 41c |
| API-08 | Tipos y clientes generados en el frontend | Pendiente | — | — |
| API-09 | Features y permisos en la respuesta | Pendiente | — | — |
| SEG-04 | Sin HTML sin escapar | Parcial | ESLint: regla propia `nianva/no-inner-html` (test en `tools/eslint-rules`, paso de CI "Probar reglas de lint propias"), `no-restricted-syntax` para `bypassSecurityTrust*` y `@angular-eslint/template/no-inline-styles`. **Excepción temporal:** `allowBindToStyle` permite los 22 `[style]` de `p-dialog` hasta que `ui-modal` los reemplace. Falta el e2e con un producto `<img src=x onerror=…>` (con Playwright) | 37 |
| SEG-06 | Sesión y CSRF | Parcial | Un 401 cierra la sesión en todas las pestañas (`SesionEntrePestanasService`, con `BroadcastChannel` o el evento `storage`) con una sola navegación; un 419 renueva la cookie CSRF y reintenta una vez; tests del interceptor con 401 y del reintento. Faltan la inactividad definida por el tenant (backend) y el e2e de dos impresiones seguidas (Playwright) | 41b |
| SEG-12 | Componente de PIN | Pendiente | — | — |
| PRO-05 | stylelint | Hecho | stylelint bloqueante en CI (`frontend/stylelint.config.mjs`) con las reglas de UI-01 y UI-04 | 39 |
| UI-01 | Solo tokens | Parcial | `libs/ui/tokens`: una fuente (`tokens.json`) de la que salen las variables CSS, el preset de PrimeNG y los breakpoints, con su `--check` en CI; stylelint bloquea colores literales y `font-family` fuera de tokens; `nianva/sin-color-en-plantilla` bloquea colores literales y clases de color fijo en plantillas. Falta la migración de las pantallas a los semánticos `--nv-*` | 38, 39, 40 |
| UI-02 | Componentes, no fragmentos | Pendiente | — | — |
| UI-03 | Claro y oscuro | Parcial | Semánticos en claro y oscuro; `tokens-contrast.spec.ts` exige 4.5:1 en los pares de texto de ambos temas; `TemaService` aplica `.nv-tema-oscuro`. Por defecto queda en claro y sin interruptor hasta migrar las pantallas; faltan el catálogo y la regresión visual | 38 |
| UI-04 | Responsivo en el componente | Parcial | Breakpoints únicos en `tokens.json` (`breakpoints.ts`); stylelint bloquea `@media` en `apps/**` y `feature/**`. Faltan los componentes responsivos, el catálogo a 375, 768 y 1280 px y el e2e de venta a 375 px | 38, 39 |
| UI-05 | Formato solo por pipes | Parcial | `libs/ui/format` (`dinero`, `cantidad`, `porcentaje`, `fecha`, `fechaHora`) con sus tests; `nianva/formato-por-pipe` exige esos pipes y prohíbe los de Angular, con 53 archivos en `formato-pendientes.json`, que solo baja. Faltan la migración de las pantallas, `tabular-nums` y los negativos en tono de peligro (con `ui-tabla`), y tomar el formato regional de la configuración del tenant | 40 |
| UI-06 | Estados con un registro global | Parcial | `REGISTRO_ESTADOS` en `libs/ui/feedback`, con 13 entidades; el valor por defecto de cada columna `estado` no lleva badge, y un test compara el registro con los enums de las migraciones. `ui-badge` lo usa. Faltan la columna `estado` de `ui-tabla`, la fila inactiva y migrar los `nucleo-status-badge` de las pantallas. La comparación con el contrato OpenAPI llega cuando los Resources declaren sus enums | 41a |
| UI-07 | Acciones | Parcial | `libs/ui/actions`: `ui-btn-crear` ("Nuevo/Nueva <objeto>"), `ui-btn-exportar` (con indicador) y `ui-row-actions`. Sus acciones son solo de icono, porque el tipado no acepta texto (`@ts-expect-error`); el orden, el icono y el tono los fija el componente; con más de 3 acciones se usa el menú ⋮, y una acción deshabilitada muestra su motivo. Tests de orden y tipado verificados por mutación. Faltan la revisión en el catálogo (UI-14) y el uso en pantallas | 42a |
| UI-08 | Un módulo, un nombre | Parcial | Registro de navegación (`EntradaNavegacion`, `REGISTRO_NAVEGACION` en `libs/ui/layout`; en `pos`, `REGISTRO_NAVEGACION_POS`, del que también sale el sidebar). `ui-page-header` toma el nombre por `clave` y no acepta título (test). `registro-navegacion.spec.ts`: nombres con mayúscula solo al inicio (se corrigieron 8), sin claves ni rutas repetidas, cada entrada lleva a una pantalla, dos entradas no llevan a la misma (se quitó "Gastos", que era Caja) y toda pantalla raíz tiene entrada o una razón. Faltan `permiso` y `feature` en las entradas, el título del navegador desde el registro y migrar los encabezados de las pantallas | 42b |
| UI-09 | Plantilla de listado | Pendiente | — | — |
| UI-10 | Componente de reporte | Pendiente | — | — |
| UI-11 | Formularios | Pendiente | — | — |
| UI-13 | Mensajes | Parcial | `ToastService` vive en `libs/ui/feedback` (`ui-shared` lo reexporta) y descarta el mismo mensaje repetido dentro de 1.5 s. El interceptor muestra un toast por error técnico, con el `correlation_id` en 5xx, y descarta el `toast.error` que la pantalla dispara ante el mismo fallo (test de un solo toast). Faltan los 4xx de negocio en el interceptor, `confirm` en tono de peligro y `ui-alert` | 41a, 41c |
| UI-14 | Catálogo visual | Pendiente | — | — |
| UI-15 | Texto por interpolación | Hecho | Por SEG-04: `nianva/no-inner-html` impide pintar texto como HTML; queda la interpolación | 37 |
| UI-16 | CSS por pantalla en línea base | Hecho | `tools/ui-baseline.mjs --check` en CI contra `frontend/ui-baseline.json` (3374 líneas en 112 archivos), que solo baja y está en CODEOWNERS | 39 |
| UI-17 | Accesibilidad mínima | Pendiente | — | — |
| UI-18 | Estados de carga | Parcial | `ui-skeleton` y `conUmbral()` (300 ms), con sus tests; `nianva/sin-texto-cargando` prohíbe "Cargando"/"Generando" en plantillas, con 36 archivos en `cargando-pendientes.json`, que solo baja. Primer uso: el QR del 2FA, con skeleton, error con "Reintentar" y "Confirmar" con indicador. `ui-page` (42b) muestra un skeleton por forma (`listado`, `detalle`, `formulario`) y el error con "Reintentar". Faltan el estado de `ui-tabla`, los botones de envío de `ui/forms` y el catálogo visual | 41a, 42b |

Conflicto que se resuelve aquí: C10.

## Fase 3: dominio

| Regla | Qué pide | Estado | Dónde se verifica | Encargo |
|---|---|---|---|---|
| ARQ-04 | Transacciones y bloqueos solo en Actions | Pendiente | — | — |
| ARQ-05 | Un solo `PricingService` | Pendiente | — | — |
| ARQ-07 | El giro es configuración | Pendiente | — | — |
| DAT-01 | Cantidades decimales con unidad | Pendiente | — | — |
| DAT-02 | Dinero | Pendiente | — | — |
| DAT-03 | Foto por línea | Pendiente | — | — |
| DAT-04 | Libros de movimientos | Pendiente | — | — |
| DAT-05 | Saldo inicial explícito | Pendiente | — | — |
| DAT-08 | Identificadores (ULID) | Pendiente | — | — |
| DAT-09 | Unicidad con tenant: el resto | Pendiente | — | — |
| DAT-10 | No se borra lo que tiene historia | Pendiente | — | — |
| DAT-15 | Costo de inventario | Pendiente | — | — |
| API-02 | Dinero y cantidades como cadena decimal | Pendiente | — | — |

Conflicto que se resuelve aquí: C6. En las Fases 3 a 5, los Services pasan a recibir DTOs.

## Fase 4: TPV

| Regla | Qué pide | Estado | Dónde se verifica | Encargo |
|---|---|---|---|---|
| DAT-07 | Folios por serie | Pendiente | — | — |
| API-07 | Idempotencia en dinero | Pendiente | — | — |
| SEG-05 | Autorización de supervisor | Pendiente | — | — |
| SEG-12 | PIN de caja | Pendiente | — | — |
| UI-12 | Impresos | Pendiente | — | — |
| UI-17 | Accesibilidad del TPV | Pendiente | — | — |

## Fase 6: reportes

| Regla | Qué pide | Estado | Dónde se verifica | Encargo |
|---|---|---|---|---|
| ARQ-09 | Una sola capa de métricas | Pendiente | — | — |
| SEG-08 | Descarga sin permiso → 403, con la primera descarga (exportaciones; si llegan antes los respaldos, en la Fase 8) | Pendiente | — | — |
| DAT-06 | Reportes en la zona del tenant | Pendiente | — | — |
| UI-10 | Plantilla de reporte | Pendiente | — | — |

## Fase 7: planes y licencia

| Regla | Qué pide | Estado | Dónde se verifica | Encargo |
|---|---|---|---|---|
| ARQ-06 | Features y límites por plan | Pendiente | — | — |
| API-09 | Límites en la respuesta | Pendiente | — | — |
| SEG-09 | Licencia | Pendiente | — | — |

## Fase 8: respaldos

| Regla | Qué pide | Estado | Dónde se verifica | Encargo |
|---|---|---|---|---|
| DAT-13 | Respaldos con formato propio | Pendiente | — | — |
