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

| Regla | Qué pide | Estado | Dónde se verifica | Encargo |
|---|---|---|---|---|
| ARQ-01 | Capas fijas; controller sin consultas (código nuevo y tocado) | Pendiente | Falta el test que prohíbe `DB::` y `Model::query()` en `Http/Controllers`, con `PENDIENTES` | — |
| ARQ-02 | Entradas tipadas: FormRequest + DTO | Hecho | `Arquitectura/EntradasTipadasTest`, PHPStan nivel 8 | C8 |
| ARQ-03 | Orquestación entre módulos en Actions | Hecho | `Arquitectura/DependenciasEntreModulosTest` | C11 |
| ARQ-06 | Middleware y convención de features | Parcial | `ModuloActivo` y `modulo:*` en las rutas; falta un test de que toda ruta de un módulo opcional lo lleva | — |
| ARQ-08 | Tipado estricto | Parcial | PHPStan nivel 8 con línea base que solo baja (CI); falta la guarda de `strict_types` en lo nuevo | — |
| ARQ-10 | Módulos congelados | Hecho | `.github/CODEOWNERS` | 28 |
| ARQ-13 | Configuración en tiempo de ejecución | Hecho | Paso de CI "Buscar URLs fijas en el frontend"; `core/runtime-config.spec.ts` | C5, 28 |
| DAT-06 | Zona horaria del tenant (configuración) | Hecho | Columna `configuracion_tenant.zona_horaria` (default `America/Mexico_City`, `timezone:all`); `Configuracion/ZonaHorariaTenantTest` | 30 |
| DAT-09 | Unicidad con tenant: código de barras | Hecho | `Arquitectura/UnicidadConTenantTest` | C4 |
| DAT-11 | Migraciones: una sola fuente | Hecho | Pasos de CI "Verificar rollback de migraciones en SQLite" y "Verificar snapshot del esquema" (`esquema:snapshot --check`); `Arquitectura/EsquemaSnapshotTest` contra `tests/Fixtures/esquema.json` (esquema SQLite) | 26, 30 |
| DAT-12 | UTF-8 de extremo a extremo | Parcial | Paso de CI "Revisar codificacion" (UTF-8 inválido, BOM, U+FFFD, `??`+letra); faltan la búsqueda de `Ã` y `conciliar:texto` (el test del importador va cuando exista un importador) | 23 |
| DAT-14 | Nada se descarta en silencio | Hecho | `Arquitectura/ModelosEstrictosTest` | C7 |
| API-01 | Versión en la ruta | Hecho | `Arquitectura/RutasVersionadasTest` | C5 |
| API-02 | Sobre de respuesta y `JsonResource` | Pendiente | Falta la regla de arquitectura con `PENDIENTES` (hoy hay 93 `response()->json`) | — |
| API-03 | Errores con `error_code` estable | Hecho | `Arquitectura/CatalogoErrorCodeTest`, `errores:catalogo --check`, `Arquitectura/ErroresSinDetallesInternosTest` (401/403/404/405/419/423/429/500 con `error_code`) | C1, 29 |
| API-04 | Cada excepción sabe responder | Hecho | `Arquitectura/BootstrapSinMapeoPorExcepcionTest`, `ManejadorExcepcionNegocioTest` | C1 |
| API-05 | Validación de entrada | Hecho | `Arquitectura/ExistenciasConTenantTest`; `Seguridad/ManipulacionDePreciosTest` (ventas, cotizar, apartados, devoluciones, compras); `Cotizaciones/CotizacionPrecioManualTest` (excepción con `cotizaciones.precio_manual`) | 32 |
| API-06 | Listados uniformes | Pendiente | Falta el contrato común y un test por listado | — |
| API-08 | Especificación OpenAPI generada y su diff en CI | Pendiente | — | — |
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
| ARQ-11 | Capas de librerías Nx | Pendiente | — | — |
| ARQ-12 | Estado y efectos | Pendiente | — | — |
| API-08 | Tipos y clientes generados en el frontend | Pendiente | — | — |
| API-09 | Features y permisos en la respuesta | Pendiente | — | — |
| SEG-04 | Sin HTML sin escapar | Pendiente | — | — |
| SEG-06 | Sesión y CSRF | Pendiente | — | — |
| SEG-12 | Componente de PIN | Pendiente | — | — |
| PRO-05 | stylelint | Pendiente | — | — |
| UI-01 | Solo tokens | Pendiente | — | — |
| UI-02 | Componentes, no fragmentos | Pendiente | — | — |
| UI-03 | Claro y oscuro | Pendiente | — | — |
| UI-04 | Responsivo en el componente | Pendiente | — | — |
| UI-05 | Formato solo por pipes | Pendiente | — | — |
| UI-06 | Estados con un registro global | Pendiente | — | — |
| UI-07 | Acciones | Pendiente | — | — |
| UI-08 | Un módulo, un nombre | Pendiente | — | — |
| UI-09 | Plantilla de listado | Pendiente | — | — |
| UI-10 | Componente de reporte | Pendiente | — | — |
| UI-11 | Formularios | Pendiente | — | — |
| UI-13 | Mensajes | Pendiente | — | — |
| UI-14 | Catálogo visual | Pendiente | — | — |
| UI-15 | Texto por interpolación | Pendiente | — | — |
| UI-16 | CSS por pantalla en línea base | Pendiente | — | — |
| UI-17 | Accesibilidad mínima | Pendiente | — | — |

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
