# Contexto de la migración: Nianva POS adaptable

> **Para:** la sesión de trabajo (Claude u otro agente) que continúa en este repo, y el
> responsable del proyecto. Léelo completo antes de proponer o tocar algo.
> **Fecha:** 2026-10-30. Se actualiza al cerrar cada encargo; los commits solo con autorización
> del responsable (PRO-09, paso 5, en `docs/estandares/06_proceso_y_calidad.md`).

## 1. Qué es este repo y qué no

| Repo | Ruta | Papel |
|---|---|---|
| **`nianva_pos`** (`DavidWM05/nianva_pos`) | `C:\Desarrollos\nianva_pos` | **Este.** Base única del producto Nianva POS. Lite, Pro, Full y SaaS son **planes y licencias** de este mismo código, no repositorios distintos |
| `nucleo-erp-base` | `C:\Desarrollos\Nucleo` | Origen: este repo nació como copia de Núcleo el 2026-07-27. **No se toca** |
| `angara_dental` | `C:\Desarrollos\Angara_Dental` | Otro proyecto. **No se toca** |
| `nianva_pos_lite` | `C:\laragon\www\nianva_pos_lite` | Sistema actual (PHP con MVC propio) **en producción** con el cliente de ropa. Solo mantenimiento de seguridad y datos. **Se trabaja en otra sesión**; no lo modifiques desde aquí |
| `Servidor_Licencias` | `C:\Desarrollos\Servidor_Licencias` | Generador de licencias firmadas (RSA). Se ajusta en la Fase 7 |

- La carpeta se llamaba `C:\Desarrollos\Nianva POS`. Algunos documentos anteriores todavía
  pueden decir "Pro" o mencionar la ruta vieja.
- El `README.md` describía el repo como "núcleo que cada vertical clona". Eso **ya no
  aplica**; se reescribió en la Fase 1 como producto único por planes y giros.

## 2. Objetivo

Un solo POS funcional y adaptable:
- **Giros:** ropa, zapatería, boutique, abarrotes o minisúper (con granel), papelería… El giro
  es configuración (atributos, unidades, categorías semilla, etiquetas), no código.
- **Módulos especiales** sobre la misma base: Agenda/citas para barbería, salón o spa y
  gimnasio.
- **Planes con precio** (tabulador): `LITE_MONOCAJA`, `PRO_MONOCAJA`, `PRO_MULTICAJA_LAN`,
  `FULL_CFDI`, `SAAS_*`. Cada plan da features y límites (sucursales, cajas, usuarios),
  verificados en el backend.
- **Entornos:** escritorio monocaja, LAN multi-tienda, servidor propio o rentado, y SaaS (BD
  compartida con `tenant_id`).
- **Aprender de los errores de Lite:** estándares y sistema de diseño **antes** de construir
  pantallas, para no ajustar responsividad, colores y formato vista por vista.

## 3. Decisiones tomadas por el responsable

1. **Se adapta este repo, no se empieza de cero:**
   - **se conserva** la plataforma: tenancy (`BelongsToTenant`), roles y permisos, 2FA,
     licencias, `ModuloActivo`, auditoría y el contrato `{message, error_code}`;
   - **se rehacen** el catálogo, los precios, las cantidades (de `int` a decimal), el TPV y toda
     la capa de UI.
2. **SaaS** con BD compartida y `tenant_id` (la que ya trae el repo).
3. **Esquema nuevo** bien diseñado. El cliente de ropa se migra desde Lite con un ETL en la
   Fase 9, sin montar Laravel sobre la BD de Lite.
4. **Lite** solo recibe la Fase 0 y mantenimiento. El precio y el costo por variante, y las
   compras que sugieren el precio de venta, se hacen **aquí** (Fases 3 y 5).
5. **Módulos congelados** (opcionales y sin inversión): Nómina, Préstamos, Delivery y CRM
   avanzado.
6. **Estándares antes que funcionalidad.**

## 4. Fases

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Endurecer Lite en producción (XSS, aislamiento por sucursal, transacción en abonos, límite de intentos de la clave de admin, costo en cambios, compras) | En Lite, otra sesión; implementado y en pruebas manuales |
| 1 | Estándares (`docs/estandares/`) y saneamiento de este repo | **En curso.** Estándares aprobados el 2026-10-30; sigue el saneamiento |
| 2 | Sistema de diseño `libs/ui/*` (tokens, formato, layout, acciones, datos, feedback, overlays, forms, print) y catálogo visual; incluye el teclado de PIN (SEG-12) | — |
| 3 | Catálogo (variante = SKU con precio y costo heredables, atributos genéricos, unidades y presentaciones, impuestos), inventario por libro y `PricingService` | — |
| 4 | TPV, terminales, sesiones de caja, folios por serie e impresos; bloqueo de pantalla con PIN (SEG-12) y autorización de supervisor (SEG-05) | — |
| 5 | Apartados, devoluciones y cambios, crédito (libro), cotizaciones, compras (sugieren el precio), cuentas por pagar y gastos | — |
| 6 | Capa de métricas y reportes | — |
| 7 | Perfiles de giro, planes del tabulador, licencia firmada | — |
| 8 | Entornos: escritorio, LAN, servidor, SaaS; instalador y actualizador | — |


| 9 | ETL del cliente de ropa (Lite → nueva base), ensayo y corte; `usuarios.pin_hash` se copia tal cual (bcrypt, compatible con `Hash::check`) para que los cajeros conserven su PIN | — |
| 10 | Módulo Agenda | — |
| 11 | CFDI 4.0 (Full) | — |

El detalle completo (hallazgos, entregables y verificación por fase) está en el plan
maestro: `C:\laragon\www\nianva_pos_lite\Docs\plan_pos_adaptable.md`, que vive fuera de este
repo.

## 5. Estado al 2026-10-30

- **Estándares aprobados** en `docs/estandares/`:
  - `README.md`: índice, glosario, decisiones D1-D5, conflictos C1-C11 con el código actual y
    las 32 lecciones de origen;
  - `01_arquitectura` a `06_proceso_y_calidad`;
  - decisiones: `id` bigint + `ulid` público (D1), costo promedio ponderado (D2, DAT-15),
    `decimal(14,3)` (D3), `error_code` en cada excepción (D4) y Actions de aplicación (D5);
  - nada de código se ha cambiado todavía.
- **Verificación tras el cambio de nombre de la carpeta:**
  - backend: `composer dump-autoload` y `php artisan test` con **296/296 en verde**;
  - frontend: dependencias reinstaladas con `pnpm install` (los enlaces apuntaban a la ruta
    vieja). `npx nx build nucleo-shell` compila con el aviso de presupuesto de bundle, que
    ya está registrado en `consideraciones_futuras.md`;
  - `nx run-many -t test` da **419/420**: un timeout de 5 s en
    `apps/nucleo-shell/src/app/modules/tpv/pages/ventas-list/ventas-list.component.spec.ts`
    ("anular pide un motivo y lo envia al confirmar"), probablemente intermitente bajo carga.
- **CI** (primer encargo del saneamiento, hecho por DS): `.github/workflows/ci.yml` con tres
  jobs, `Backend` (`php artisan test`), `Frontend` (`pnpm nx run-many -t test`) y
  `Escaneo de skip sin referencia`. Se borró el `frontend/.github/workflows/ci.yml` de Nx, que
  nunca corría. Falta activar la protección de `master` cuando la primera corrida pase.
- **Spec intermitente** de `ventas-list`: no reproducible en más de 20 corridas, ni con un solo
  worker. No se cambió nada; si reaparece en CI, se abre un encargo con esa evidencia. Los 6
  specs que llaman `vi.useFakeTimers()` (`usuarios-list`, `metodos-pago-list`, `roles-list`,
  `clientes-list`, `categorias-list`, `departamentos-list`) restauran el reloj en `afterEach`
  (revisado el 2026-10-31).
- **Línea base inicial** (medida por DS; el séptimo encargo la dejó en cero, ver abajo):
  - `vendor/bin/pint --test`: 84 archivos con fallas;
  - `nx run-many -t lint`: 9 errores en `ui-shared` (selectores sin prefijo `lib`) y 7
    warnings (`no-non-null-assertion`);
  - `nx build nucleo-shell`: en verde, con los avisos del presupuesto del bundle y de `qrcode`.
- **C1 resuelto** (segundo encargo, hecho por DS): las 45 excepciones de negocio extienden
  `ExcepcionNegocio` y `bootstrap/app.php` tiene un solo manejador genérico. Catálogo en
  `docs/estandares/catalogo_error_code.md` (`php artisan errores:catalogo`). Los tres códigos
  de CxP que repetían los de CxC pasan a `cuenta_pagar_ya_pagada`, `cuenta_pagar_anulada` y
  `cuenta_pagar_con_abonos`.
- **Validaciones de negocio, de 500 a 422** (tercer encargo, hecho por DS): se revisaron los
  46 `throw new InvalidArgumentException` de los Services. Las 20 que llegaban a HTTP
  respondían 500; ahora responden 422:
  - 10 casos con 9 excepciones nuevas (`caja_ya_cerrada`, `venta_total_negativo`,
    `venta_ya_anulada`, `devolucion_variante_no_vendida`,
    `devolucion_excede_cantidad_vendida`, `cotizacion_total_negativo`,
    `plan_pago_ya_activo`, `cuota_ya_pagada`, `pago_cuota_insuficiente`);
  - 10 con validación de entrada: variante y cliente con scope de tenant
    (`Inventario/Support/ReglasVariante`) y las reglas condicionales de `items_nuevos` en
    Devoluciones.

  También se corrigió que una compra aceptaba el proveedor de otro tenant. Las que no
  llegan a HTTP siguen como guarda interna. Delivery (congelado) sigue respondiendo 500 con
  una variante de otro tenant. Backend: 324 tests.
- **Reglas `exists` con scope de tenant, API-05** (cuarto encargo, hecho por DS): se
  revisaron 46 reglas `exists`. Las que apuntan a tablas con tenant filtran por él con
  `Nucleo/Support/ReglasTenant` (`existe` y `existeGlobalODelTenant` para `metodos_pago`,
  `unidades_medida` y `roles`) o con reglas por relación (`ReglasVariante`, `ReglasCuota`,
  `ReglasCaja`). Antes se podían crear cotizaciones, ventas, productos o usuarios con datos
  de otro negocio. También se corrigieron los módulos congelados. `usuarios` filtra por el
  tenant exacto, porque `tenant_id` NULL es superadmin. El test
  `Arquitectura/ExistenciasConTenantTest` impide volver a escribir un `exists` sin el
  filtro.
- **Unicidad con tenant, DAT-09 y C4** (quinto encargo, hecho por DS): `producto_variantes`
  tiene `tenant_id` propio, que el modelo copia del producto al crearse, e índice
  `UNIQUE(tenant_id, codigo_barras)`. `insumos.sku` y `gift_cards.codigo` también son
  únicos por tenant. La validación y el generador automático de códigos de barras
  comprueban duplicados solo dentro del tenant. El test
  `Arquitectura/UnicidadConTenantTest` revisa todos los índices únicos; las excepciones
  son `usuarios.correo` (el login busca por correo antes de conocer el tenant) y
  `empleados.usuario_id` (uno a uno). Las migraciones se reescribieron (DAT-11): las bases
  de desarrollo locales necesitan `php artisan migrate:fresh --seed`.
- **C11 resuelto, ARQ-03** (sexto encargo, hecho por DS): cuatro Actions en
  `backend/app/Aplicacion/` (`RegistrarVenta`, `RegistrarDevolucion`, `CerrarCaja`,
  `ObtenerResumenInicio`), con la transacción dentro y tests de atomicidad. Los
  controladores quedaron delgados y el contrato HTTP no cambió. Se retiró la lista de
  "instancias de orquestación en Controller". Decisión del responsable: los módulos de
  extensión pueden depender de los módulos base, nunca entre sí. El test
  `Arquitectura/DependenciasEntreModulosTest` verifica el grafo. Backend: 377 tests.
- **Análisis estático bloqueante, PRO-05 y PRO-03** (séptimo encargo, hecho por DS): el job
  Backend corre `pint --test` y PHPStan nivel 8 con Larastan (`backend/phpstan.neon`). La
  deuda de PHPStan queda congelada en `backend/phpstan-baseline.neon`: 1496 errores, sin
  corregir ninguno. En cada PR, CI falla si ese total sube respecto a la rama base. Pint
  reformateó 82 archivos del backend (solo formato). ESLint de `ui-shared` usa el prefijo
  `nucleo` y queda en 0 errores; los 7 warnings `no-non-null-assertion` de las specs se
  conservan. Al instalar Larastan, Composer reportó 23 advisories de seguridad en 6
  paquetes (pendiente).
- **C7 resuelto, DAT-14** (octavo encargo, hecho por DS): fuera de producción, Eloquent
  lanza excepción si descarta un campo, si carga una relación perezosa en una colección
  (N+1) o si se lee un atributo no seleccionado. Se corrigieron `AuditObserver` (lee
  `tenant_id` solo si el modelo tiene la columna), `ProductoResource` (`stock_total` solo
  en el listado) y `RevalidarLicenciasCommand` (`with('tenant')`). Excepción a PRO-01
  autorizada: `$usuario->refresh()` en los helpers de `AuthTest` y `UsuarioControllerTest`,
  porque `actingAs()` quita la marca de recién creado y el usuario en memoria no tenía las
  columnas de 2FA. No se encontraron N+1 en los listados. Backend: 381 tests; línea base
  de PHPStan: 1495. En desarrollo local, una ruta sin test con N+1 ahora responde 500.
- **C2 resuelto, SEG-03** (noveno encargo, hecho por DS): decisión del responsable, el
  middleware `permiso:*` de cada ruta es la única autoridad; se retiraron las 6 Policies de
  Núcleo (registradas con `#[UsePolicy]`, nadie las llamaba). Huecos cerrados:
  `unidades-medida` no exigía permiso (y su controller fallaba por un `use` faltante);
  `GET /auditoria` ahora exige `auditoria.ver` (el visor de historial muestra "No tienes
  permiso" ante un 403); anular una CxP pedía `cuentas_pagar.ver` y ahora
  `cuentas_pagar.anular` (permiso nuevo en el seeder). Tests: `RutasConPermisoTest` (10
  rutas exentas con razón) y `MatrizPermisosTest` (admin y vendedor, 89 rutas; quedan fuera
  60 con route model binding). Excepción a PRO-01 autorizada en 4 tests (permisos del
  usuario de prueba; el de `/auditoria` sin permiso se reescribió). Backend: 390 tests;
  línea base de PHPStan: 1479.
- **C3 resuelto, SEG-02** (décimo encargo, hecho por DS): `Nucleo/Support/SucursalOperacion`
  resuelve la sucursal de una operación. Es la del usuario; otra solo con el permiso nuevo
  `sucursales.todas` y si es del mismo tenant. En escrituras responde 422
  `sucursal_no_permitida` (o `sucursal_requerida` si el usuario no tiene sucursal); en
  filtros ignora la solicitada. Se aplicó en `POST /cotizaciones`, `POST /pedidos`,
  `POST /insumos/{insumo}/stocks`, `POST /nominas/generar` (antes la tomaban del payload,
  ahora opcional) y `GET /ventas/reporte`. La asignación de sucursal a usuarios y empleados
  es un atributo y queda exenta en `Arquitectura/SucursalDelContextoTest`. Corrección
  propia en la revisión: un usuario sin sucursal ni `sucursales.todas` ya no ve el reporte
  de todas las sucursales. Ningún test existente modificado. Backend: 417 tests; línea
  base de PHPStan: 1477. En una instalación existente, `sucursales.todas` aparece al correr
  `NucleoRolesPermisosSeeder`.
- **C8, ARQ-02, lote 1** (undécimo encargo, hecho por DS): base
  `Nucleo/Http/Requests/SolicitudNegocio` (`authorize()` en `true`, `toDto()` abstracto) y
  FormRequests + DTOs `readonly` en Tpv (ventas, cotizar, anular, abrir y cerrar caja),
  Apartados (crear, abonar, cancelar), Devoluciones y Gastos (listar y crear).
  `RegistrarVenta` y `RegistrarDevolucion` reciben su DTO; los Services compartidos
  conservan su firma (se migran después). Refactor sin cambio de comportamiento: ningún test
  existente modificado. `Arquitectura/EntradasTipadasTest` deja 29 controllers en
  `PENDIENTES`. Fuera del test queda `RequiereDosFactorReciente`, un middleware que también
  valida. Backend: 422 tests; línea base de PHPStan: 1458.
- **C8, lote 2** (duodécimo encargo, hecho por DS): Inventario (categorías, departamentos,
  productos, variantes, proveedores, compras), Precios (cupones, validar cupón, reglas de
  precio) y Crm (clientes, planes de pago). Un `Guardar<Recurso>Request` por recurso para
  crear y editar. Las ediciones parciales conservan la diferencia entre campo ausente y
  `null` (`camposPresentes()` / `datosPresentes()`), con un test por recurso. Las reglas de
  precio siguen limpiando los campos del tipo anterior, como antes. Corrección propia en la
  revisión: un mensaje de `GuardarReglaPrecioRequest` llegó con la codificación rota
  (`categor??a`); se corrigió y lo cubre `Precios/ReglaPrecioMensajesTest`. El checklist de
  DS busca U+FFFD, pero esta rotura (`??`) no lo usa. Quedan 19 controllers en `PENDIENTES`.
  Backend: 431 tests; línea base de PHPStan: 1441.
- **C8, lote 3** (decimotercer encargo, hecho por DS): extensiones activas (Cotizaciones,
  CxC, CxP, GiftCards, Produccion, UnidadesMedida). En cotizaciones y stock de insumos la
  sucursal se resuelve con `SucursalOperacion` dentro del `toDto()` y el DTO la entrega ya
  resuelta. Excepción a PRO-01 autorizada: `SucursalDelContextoTest` también revisa
  `Http/Requests`; DS comprobó que falla si se quita el resolvedor. Ediciones parciales en
  cotizaciones y unidades de medida, con test. Quedan 13 controllers en `PENDIENTES`
  (Núcleo y autenticación, Auditoría, Configuración y los congelados). Backend: 436 tests;
  línea base de PHPStan: 1413.
- **C8, lote 4** (decimocuarto encargo, hecho por DS): Núcleo (login, 2FA, recuperación y
  cambio de contraseña, usuarios, roles, métodos de pago, configuración de seguridad),
  Configuración y Auditoría. Las rutas sin sesión no usan el tenant. Contraseñas, códigos
  TOTP y tokens van en los DTOs con `#[\SensitiveParameter]`. DS se detuvo al ver que roles,
  métodos de pago y configuración revisan el recurso antes de validar (403/404). Decisión del
  responsable: esa guarda va en el `authorize()` del FormRequest con `abort()`
  (`Nucleo/Support/GuardasDeRecurso`); `Nucleo/GuardasDeRecursoTest` comprueba que un
  payload inválido sigue recibiendo el 403/404 y no 422. Excepción a PRO-01 autorizada: la
  entrada de usuario en `ATRIBUTOS` de `SucursalDelContextoTest` apunta al FormRequest.
  Quedan en `PENDIENTES` solo los 4 módulos congelados. Backend: 444 tests; línea base de
  PHPStan: 1404.
- **C8 resuelto, lote 5** (decimoquinto encargo, hecho por DS): módulos congelados
  (CrmAvanzado, Delivery, Payroll, Préstamos), con cambio mínimo. Pedidos y nóminas
  resuelven la sucursal en el FormRequest; la sucursal del empleado es un atributo. La guarda
  de tenant del cliente en CRM avanzado pasó a `authorize()` (`CrmAvanzado/Support/GuardasCliente`).
  Excepciones a PRO-01 autorizadas: la entrada de empleado en `ATRIBUTOS` de
  `SucursalDelContextoTest` y `PENDIENTES` vacía en `EntradasTipadasTest` (DS comprobó que
  sigue fallando si un controller vuelve a validar en línea). Ningún controller valida en
  línea. Backend: 448 tests; línea base de PHPStan: 1392 (1495 al crearla).
- **C5 resuelto, API-01** (decimosexto encargo, hecho por DS): la API vive en `/api/v1`
  (`apiPrefix` en `bootstrap/app.php`). Decisión del responsable: las rutas de sesión de
  Sanctum (`/login`, `/logout`, `/login/2fa-verify`, `/password/*`, `/sanctum/csrf-cookie`)
  quedan en la raíz, sin versión. El frontend lee `apiBaseUrl` de `public/config.json` antes
  del bootstrap (`core/runtime-config.ts`); si falta, usa el mismo origen. Los servicios usan
  `urlApi()` y `urlSesion()` (`core/api-config.ts`). Excepción a PRO-01 autorizada: en 76
  tests del backend solo cambiaron URLs (362 inserciones de `v1/`, verificado con
  `--word-diff`). Corrección propia en la revisión: con base vacía, el interceptor XSRF
  aceptaba `//otro-dominio/...` como propia; ya no, con su test. Los documentos de contrato
  (`02_CONTRATO_API.md`, `API_SPECIFICATION.md`, `MANUAL_TECNICO.md`) pasan a `/api/v1`.
  Backend: 450 tests; `nucleo-shell`: 429. En la Fase 8, el instalador escribe `config.json`.
- **Documentación del repo** (hecho por Claude): `README.md` nuevo (producto único por planes
  y giros, qué leer primero, cómo levantarlo con `/api/v1` y `config.json`, comandos de
  calidad) y `.claude/CLAUDE.md` reescrito como resumen accionable de los estándares (capas
  con FormRequest y DTO, tenant y sucursal, permisos, API, frontend, pruebas y proceso). En
  `backend/README.md` y `frontend/README.md`, las rutas pasan a `/api/v1` y se corrigen dos
  permisos que habían cambiado (anular CxP y unidades de medida). Los nombres del paquete y
  de la app siguen siendo los actuales hasta el renombre.
- **Factories, lote 1, PRO-08** (decimoséptimo encargo, hecho por DS): 40 factories para los
  modelos base, más instalación, licencia y plan, en `Modules/<Modulo>/Database/Factories/`,
  resueltas con `Factory::guessFactoryNamesUsing` en `AppServiceProvider`. Estados con nombre
  (`admin()`, `vendedor()`, `superadmin()`, `anulada()`, etc.). En la revisión, el primer
  entregable creaba las relaciones por adelantado: con tenant y sucursal dados, una venta
  quedaba con cliente y usuario de otro tenant y creaba 9 tenants de más (~32 s). Se corrigió
  a closures perezosos y lo cubre `Factories/FactoriesConDatosDadosTest` (20 casos). Los
  totales de los documentos padre no se sincronizan con sus hijos sin pasar por los
  Services. `Arquitectura/FactoriesTest` exige factory a todo modelo, salvo los pivotes
  (`SIN_FACTORY`) y las 27 extensiones del lote 2 (`PENDIENTES`). Ningún test existente
  modificado. Backend: 519 tests.
- **Factories, lote 2** (decimoctavo encargo, hecho por DS): los 27 modelos de las extensiones,
  con el mismo patrón de closures. `PENDIENTES` de `FactoriesTest` queda vacía: todo modelo
  tiene factory salvo los pivotes. Nota de crédito, cuentas por cobrar y por pagar nacen de las
  factories del lote 1 (devolución, venta y compra) en el mismo tenant. Ningún test existente
  modificado. Backend: 597 tests.
- **Nombres internos** (decimonoveno encargo, hecho por DS). Decisión del responsable:
  - el paquete composer es `nianva/pos`;
  - el workspace Nx es `@nianva/source`, y las librerías, `@nianva/ui-shared` y
    `@nianva/design-tokens`;
  - la app Nx `nucleo-shell` pasa a `pos` (`frontend/apps/pos`, `nx serve pos`, salida en
    `dist/apps/pos`), movida con `git mv`.

  El prefijo de selector `nucleo-` se queda hasta la Fase 2. Excepción a PRO-01 autorizada:
  en 68 specs solo cambió la línea de import (`@nucleo/` → `@nianva/`), verificado con
  `--word-diff`. Un paso nuevo del job `escaneo-skip` falla si reaparecen `@nucleo/`, `@org/`
  o `nucleo-shell`. Los locks no cambiaron de versiones. Los documentos y los README usan los
  nombres nuevos; las entradas anteriores de este archivo conservan los nombres de su
  momento.
- **Frontend por `error_code`, API-04** (vigésimo encargo, hecho por DS):
  - `php artisan errores:catalogo` genera también
    `libs/ui-shared/src/lib/errores/codigos-error.ts` (56 códigos, tipo `CodigoError`), y
    `--check` falla si el `.md` o el TS no están al día (`CatalogoErrorCodeTypescriptTest`);
  - `@nianva/ui-shared` exporta `leerErrorNegocio`, `mensajeError` y `esErrorNegocio`; los 12
    helpers privados de los componentes se eliminaron, y el texto que ve el usuario no cambió;
  - reacciones a un código concreto: `caja_ya_cerrada` recarga la caja; `venta_ya_anulada`
    recarga la lista de ventas, porque ahí vive la anulación; `cuota_ya_pagada` y
    `plan_pago_ya_activo` recargan el plan o la venta; `sucursal_requerida` muestra un mensaje
    fijo en cotización, pedido y nómina.

  Backend: 599 tests; `ui-shared`: 22; `pos`: 436.
- **Grafo sin pendientes, ARQ-03** (vigesimoprimer encargo, hecho por DS):
  - las ventas a plazos pasan de Crm a la extensión `Modules/VentasPlazos` (decisión del
    responsable), movidas con `git mv`: modelos, servicios, controller, requests, DTOs,
    excepciones, `ReglasCuota`, factories y migraciones. Tablas, rutas, permisos y
    `error_code` no cambian; se quitó `Cliente::planesPago()`, que no se usaba;
  - `CajaController::actual()` usa la Action `Aplicacion/Caja/ObtenerCajaActual`.

  `DependenciasEntreModulosTest` queda sin `PENDIENTES`. Excepción a PRO-01 autorizada: en los
  tests solo cambiaron los namespaces de las clases movidas. Backend: 603 tests; línea base de
  PHPStan: 1386.
- **Seguridad de dependencias del backend** (vigesimosegundo encargo, hecho por DS):
  `composer audit` reportaba 23 avisos en 6 paquetes. El más grave era crítico: bypass de
  autenticación en el TokenGuard de Laravel. Se actualizaron esos 6 paquetes y lo que
  arrastraban (50 en total), sin cambiar `composer.json` ni ninguna versión mayor; Laravel
  pasa de 13.20 a 13.39. `composer audit` queda sin avisos, y el job Backend de CI tiene un
  paso nuevo que falla si aparece uno. Ningún test modificado. Línea base de PHPStan: 1385.
- **Guardas de CI de PRO-01 y DAT-12, y CODEOWNERS** (vigesimotercer encargo, hecho por DS):
  el job "Escaneo de skip sin referencia" suma dos pasos, sin cambiar el nombre de ningún job:
  - en cada PR, compara los métodos de test por archivo contra la base del merge (`HEAD^1`) y
    falla si alguno baja o si se borra un archivo de test. La etiqueta `pro-01-autorizado`, que
    pone el responsable, convierte el fallo en aviso; el workflow también corre con `labeled`
    y `unlabeled` para que la etiqueta surta efecto;
  - siempre, revisa la codificación de `backend/{app,config,routes,database,tests}`,
    `frontend/{apps,libs}` y `docs/estandares`: UTF-8 inválido, BOM, U+FFFD y `??` seguido de
    letra. El repo está limpio.

  `.github/CODEOWNERS` marca tests, specs, la línea base de PHPStan, los workflows y los
  estándares. No se exige la revisión del dueño en el ruleset, porque con un solo dueño
  bloquearía sus propios PRs. En la revisión se corrigieron tres fallos: un archivo de test
  nuevo hacía fallar el paso, la comparación usaba la punta de `master` en vez de la base del
  merge (falso rojo si `master` avanzaba) y la etiqueta no volvía a disparar el workflow.
- **Seguridad de dependencias del frontend** (vigesimocuarto encargo, hecho por DS):
  - antes: `pnpm audit --prod` daba 7 avisos (4 altos) y el árbol completo 126 (2 críticos y
    52 altos);
  - cambios: Angular pasa de 22.0 a 22.2, Nx de 23.1 a 23.3 y PrimeNG a 22.1; el resto de las
    herramientas se actualizó dentro de su versión mayor. Hay un override en
    `pnpm-workspace.yaml`, `undici >=7.30.1 <8`, que llegaba por Nx. No hubo salto de versión
    mayor;
  - después: producción sin avisos y el árbol completo sin altos ni críticos;
  - queda un moderado en `minimatch` (dev), que solo se corrige pasando a la 11;
  - el job Frontend corre `pnpm audit --prod` (bloquea con cualquier aviso) y
    `pnpm audit --audit-level high`.

  Las migraciones de Nx 23.2 y 23.3 no aplican: los `targetDefaults` ya declaran `cache` y no
  hay objetivos `prune-lockfile` ni `deploy`. Ningún test modificado; ui-shared 22 y pos 436.
- **Roles y permisos en una edición parcial** (vigesimoquinto encargo, hecho por Claude): un
  `PUT` a un rol o a un usuario que omitía `permisos` o `roles` los quitaba todos (`sync([])`).
  - Ahora `RolDto::permisosParaSync()` y `UsuarioDto::rolesParaSync()` devuelven `null` si la
    lista no llegó, y `update` la conserva.
  - Una lista vacía, o `null` explícito, sí llega y la vacía. Crear sin lista no cambia.
  - El frontend no tenía el problema: sus formularios siempre mandan la lista.
  - Cinco tests nuevos en `RolEdicionParcialTest` y `UsuarioEdicionParcialTest`; los dos que
    reproducen el bug fallaron antes de la corrección.
  - Backend: 608 tests.
- **Seeders por escenario, PRO-08** (vigesimosexto encargo, hecho por DS):
  - **Qué hay:** `database/seeders/Escenarios/` tiene cuatro escenarios (ropa, abarrotes con
    granel, multi-sucursal con 3 sucursales y plan Lite) y `EscenariosSeeder`, que los corre
    todos. No se llaman desde `DatabaseSeeder`.
  - **Cómo siembran:** el catálogo, con las factories. El stock entra por
    `InventarioService::registrarCompra()`, la caja se abre con `CajaService` y las ventas pasan
    por `RegistrarVenta`, así que el kardex cuadra con el stock.
  - **Garantías:**
    - semilla fija, así que dos cargas sobre una BD limpia dan los mismos datos;
    - idempotentes por nombre de tenant;
    - se niegan a correr en producción.
  - **Plan Lite:**
    - plan `lite` con 1 sucursal y 3 usuarios;
    - licencia activa y `modulos_activos` vacío;
    - los límites del plan todavía no se aplican en código.
  - **Granel:** variantes en `kg` con cantidades enteras, hasta la Fase 3 (C6).
  - **CI:** el job Backend corre `migrate:fresh --seed` y los escenarios sobre una SQLite en
    archivo.
  - **Corregido en la revisión:**
    - `VentaController::reporte` respondía 500 fuera de producción, por cargas perezosas en
      `por_metodo_pago` y `top_productos`. Se corrigió con `with()` y dos tests nuevos en
      `VentaReporteTest`; DS lo había esquivado apagando el modo estricto en su test, y ese
      parche se quitó;
    - cada escenario corre en una transacción. Antes, uno que fallaba a medias dejaba su
      tenant y la siguiente corrida lo saltaba incompleto.
  - **Tests:** 11 nuevos (8 de escenarios y 3 de reporte). Backend: 618 tests.
- **Lote de menores de la Fase 1** (vigesimoséptimo encargo, hecho por DS):
  - **Matriz de permisos (SEG-03):** un método nuevo en `MatrizPermisosTest` crea con su
    factory el modelo de cada ruta con route model binding y cubre las 60 rutas por rol.
    `RUTAS_BINDING_SIN_CUBRIR` queda vacía. No hubo hallazgos de seguridad. Si se quita un
    `permiso:*`, el test falla.
  - **Producción:** `PATCH ordenes-produccion/{id}/estado` pide `produccion.completar` en vez
    de `produccion.crear`. Lo cubre `CambiarEstadoOrdenPermisoTest`, que falló antes del
    cambio. El frontend no se tocó, porque Producción está congelado.
  - **`packageManager`:** `frontend/package.json` declara `pnpm@11.5.3`, y CI toma la versión
    de ahí (`package_json_file`) en vez de repetirla.
  - Ningún test existente modificado. Backend: 622 tests.
- **Guardas de ARQ-10, SEG-07 y ARQ-13** (vigesimoctavo encargo, hecho por DS):
  - **CODEOWNERS:** marca los módulos congelados (Payroll, Prestamos, Delivery y CrmAvanzado)
    en el backend y en el frontend. CRM avanzado no tiene carpeta propia en el frontend: se
    listan sus archivos dentro de `modules/crm`;
  - **gitleaks 8.30.1:** se instala en el job "Escaneo de skip sin referencia" con su
    checksum verificado contra el oficial, y escanea el árbol versionado (`gitleaks dir`). El
    historial completo, 121 commits, se revisó en local: sin hallazgos. No hizo falta
    `.gitleaks.toml`;
  - **guardas nuevas en el mismo job:**
    - llaves privadas versionadas (`-----BEGIN … PRIVATE KEY-----`);
    - URLs fijas (`localhost`, `127.0.0.1`, `http://`) en `frontend/apps` y `frontend/libs`;
      solo se permite `public/config.json`;
  - **test nuevo en `runtime-config.spec.ts`:** el mismo build con dos `config.json`;
  - cada guarda se probó fallando y pasando. `pos` queda en 437 tests.
- **Pendientes detectados:**
  - `Produccion` usa `UnidadMedida` (extensión → extensión); las unidades se rediseñan en la
    Fase 3 (DAT-01);
  - permisos de acción distinta que son intencionales: `desactivar` con `.eliminar` y los
    catálogos de apoyo;
  - la suite de `pos` tuvo timeouts de 5 s bajo carga en una corrida local (Nx la marcó
    inestable); vigilar en CI y, si se repite, revisar los specs más lentos;
  - `VentaController` y `CompraController` toman el tenant de `$request->user()` y el resto
    de `TenantContext` (equivalentes); se unifica al migrar a FormRequest (C8).
- **Git:** `master` está protegido (ruleset `proteger-master`): todo entra por PR con los tres
  checks en verde.

## 6. Siguiente paso, en orden

1. **Saneamiento de la Fase 1, en curso.** El 2026-11-01 se revisaron contra el repo todas las
   reglas "Desde: Fase 1": varias no tienen todavía su "Verifica" (ver "Falta en la Fase 1",
   abajo). Hecho: CI con ambas
   suites, C1 (D4), las validaciones de negocio (500 → 422) y las reglas `exists` con
   tenant (API-05), la unicidad con tenant (DAT-09, C4), C11 (D5) y el análisis estático
   bloqueante (Pint, ESLint, PHPStan), C7 (DAT-14), C2 (SEG-03), C3 (SEG-02), C8 (ARQ-02), C5 (API-01), la documentación del repo (`README.md` y
   `.claude/CLAUDE.md`), `composer audit`, las guardas de PRO-01 y DAT-12 con CODEOWNERS
   y `pnpm audit`, la edición parcial de roles y usuarios, C9 y los seeders por escenario (PRO-08). De los conflictos C1-C11
   solo quedan C6 (Fase 3) y C10 (Fase 2).

   **Falta en la Fase 1.** El estado regla por regla está en
   [SEGUIMIENTO_FASES.md](SEGUIMIENTO_FASES.md). En orden, un encargo por línea:
   1. ~~CODEOWNERS de los módulos congelados (ARQ-10), gitleaks en CI (SEG-07) y la guarda de
      URLs fijas en el frontend (ARQ-13)~~, hecho en el encargo 28;
   2. errores 500 sin detalles internos y con `correlation_id` (SEG-11); `storage/` fuera del
      docroot, con sus tests (SEG-08);
   3. `migrate:rollback` en CI y snapshot del esquema (DAT-11); `zona_horaria` en la
      configuración del tenant (DAT-06);
   4. auditar los tests que piden SEG-10, API-05 y SEG-01 (el test que recorre las rutas con
      modelo y exige su test de aislamiento), y completar los que falten;
   5. `strict_types` en el código nuevo y tocado, con una lista que solo baja (ARQ-08); test de
      que los controllers no usan `DB::` ni `Model::query()`, con `PENDIENTES` (ARQ-01); y que
      toda ruta de un módulo opcional lleva `modulo:*` (ARQ-06);
   6. DAT-12: búsqueda en CI de `Ã` (doble codificación) y el comando `conciliar:texto`;
   7. especificación OpenAPI generada y su diff en CI (API-08, parte de la Fase 1);
   8. regla "los controllers devuelven `JsonResource`", con `PENDIENTES` (API-02, parte de la
      Fase 1);
   9. contrato común de listados, con `PENDIENTES` (API-06).

   Decisiones del responsable (2026-11-01):
   - de API-02, el dinero y las cantidades como cadena pasan a la Fase 3, con DAT-02;
   - de API-08, los tipos generados en el frontend pasan a la Fase 2;
   - la rama principal sigue siendo `master`: no se renombra a `main`.

   Quedan para fases posteriores:
   - stylelint (PRO-05) pasa a la Fase 2;
   - después de C8: que los Services reciban DTOs en vez de arreglos (se hace al reescribirlos
     en las Fases 3 a 5); `RequiereDosFactorReciente` sigue validando dentro del middleware.
2. **Fase 2: sistema de diseño**, cuando cierre la Fase 1.

## 7. Reglas de trabajo con el responsable

- **No hacer `git commit` ni `push` sin indicación explícita.**
- Antes de implementar algo ya aprobado, preguntar: **"¿lo hago yo o preparo el prompt para
  DS?"**. DS es un agente externo que implementa a partir de prompts. Sus prompts y reportes
  van en español.
- Encargos a DS (`docs/estandares/06`, PRO-09):
  - un tema por encargo;
  - solo **agregar** métodos de test, nunca reescribir ni borrar tests existentes;
  - conteo de tests antes y después;
  - checklist de cierre en el reporte;
  - sin commit.
- Revisar siempre el diff de DS contra el prompt: cambios fuera del tema, tests modificados,
  líneas base.
- No correr la suite ni recargar BD de pruebas mientras DS trabaja en el mismo repo.
- **No usar Python** (no está instalado). Usar PHP, Node o las herramientas de edición.
- Archivos en UTF-8 sin BOM. No editar con `Set-Content`/`Out-File` de PowerShell.
- Los documentos de estrategia (plan, tabulador, análisis de mercado, segmentación) no se suben
  al repo.
- Respuestas al responsable en español.

## 8. Archivos de referencia

**En Lite** (`C:\laragon\www\nianva_pos_lite\Docs\`, solo lectura desde aquí):

| Archivo | Para qué |
|---|---|
| `plan_pos_adaptable.md` | Plan maestro por fases (fuente de este documento) |
| `tabulador_de_precios_y_estructura_de_licencias.md` | Planes, precios y payload de licencia con features y límites |
| `roadmap_de_segmentaci_n_de_m_dulos_pos.md` | Segmentación de módulos por plan |
| `segmentacion_plantillas.md` | Plantillas por giro |
| `plan_de_migraci_n_y_arquitectura_pos.md`, `analisis_tecnico_actual.md` | Análisis previos de la migración |
| `estandar_ui.md` | Las 28 reglas visuales de Lite (mapeadas en `docs/estandares/05`) |
| `convenciones.md` | Convenciones de Lite y su checklist §9 (origen de `docs/estandares/06`) |

**En este repo:**
- `docs/estandares/*`: norma superior (aprobada el 2026-10-30);
- `docs/REPORTE_PIN_LITE.md`: cómo funciona el PIN en Lite (login, bypass de admin, bloqueo de
  pantalla, alta y cambio), sus 9 debilidades y la propuesta para adaptarlo (bloqueo del lado del
  servidor, autorización de supervisor SEG-05, un solo componente de PIN);
- `.claude/CLAUDE.md`: resumen accionable de los estándares para quien escribe código;
  si contradice un estándar, gana el estándar;
- `docs/MANUAL_TECNICO.md`, `docs/nucleo_arquitectura.md`, `docs/API_SPECIFICATION.md`,
  `docs/consideraciones_futuras.md`, `docs/01_ARQUITECTURA_BASE.md`,
  `docs/02_CONTRATO_API.md`, `docs/03_ESPECIFICACION_BACKEND.md`,
  `docs/04_ESPECIFICACION_FRONTEND_UX.md` y `docs/ANALYSIS_AND_BLUEPRINT.md`: referencia del
  porqué de lo construido (del 01 al 04 y el blueprint, revisar en el saneamiento si se
  conservan o se archivan). Donde contradigan un estándar aprobado, gana el estándar.
