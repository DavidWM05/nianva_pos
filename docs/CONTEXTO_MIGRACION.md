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
- **Errores sin detalles internos y `storage` fuera del docroot** (vigesimonoveno encargo,
  hecho por DS):
  - **SEG-11:**
    - el middleware global `Nucleo/Http/Middleware/CorrelationId` genera un ULID por
      petición. Lo pone en el contexto del log y en la cabecera `X-Correlation-Id`, y nunca
      acepta uno que mande el cliente;
    - un 500 con `APP_DEBUG=false` responde `{message, error_code: error_interno,
      correlation_id}`, sin SQL, rutas ni trazas. El detalle queda en el log con el mismo id;
  - **API-03:** los errores que no son de negocio llevan su `error_code`. El mapa de status a
    código vive en `Nucleo/Support/MapaErroresHttp` (15 códigos, de `solicitud_invalida` a
    `tiempo_agotado`). `errores:catalogo` los incluye y `CatalogoErrorCodeTest` comprueba
    que no chocan con los de negocio. La validación conserva `{message, errors}` y
    `ExcepcionNegocio` su propio código;
  - **SEG-08:**
    - `filesystems.links` queda vacío y el disco `local` deja de servir archivos
      (`'serve' => false`; Laravel publicaba `storage/{path}` con URL firmada);
    - `GET /storage/...` responde 404;
    - por decisión del responsable, el 403 de una descarga sin permiso se prueba con la
      primera ruta de descarga (Fase 6 u 8);
  - tests nuevos: `ErroresSinDetallesInternosTest` y `StorageFueraDelDocrootTest`, más un
    método en `CatalogoErrorCodeTest`. Ningún test existente modificado. Backend: 633 tests.
- **Rollback y snapshot del esquema; zona horaria del tenant** (trigésimo encargo, hecho por
  DS):
  - **DAT-11, rollback:** el job Backend corre `migrate:fresh` y `migrate:rollback
    --step=1000` sobre SQLite y falla si queda alguna tabla de la app; después vuelve a
    migrar;
  - **DAT-11, snapshot:** `php artisan esquema:snapshot` (con `--check`) genera
    `tests/Fixtures/esquema.json` con tablas, columnas, índices y llaves foráneas, en una
    SQLite temporal propia. Lo comprueban CI y `EsquemaSnapshotTest`. El snapshot es del
    esquema en SQLite; los tipos en MySQL pueden diferir;
  - el `down()` de `make_token_firmado_nullable_en_licencia_local` no devolvía la columna a
    NOT NULL. DS lo corrigió; en la revisión se le devolvió el `comment` original, porque
    `change()` redefine la columna completa;
  - **DAT-06:** columna `zona_horaria` en `configuracion_tenant` (en la migración original,
    por DAT-11), default `America/Mexico_City`, validada con `timezone:all`. Es opcional en
    el `PUT` y la devuelve el Resource. Los cálculos en esa zona van en la Fase 6;
  - tests nuevos: `EsquemaSnapshotTest` y `ZonaHorariaTenantTest`. Backend: 638 tests.
  - Para una BD de desarrollo existente: `php artisan migrate:fresh --seed` y volver a correr
    `DesarrolloSeeder`.
- **Reseteo de emergencia del 2FA** (trigésimo primer encargo, hecho por DS y completado en la
  revisión):
  - **comando `php artisan usuarios:resetear-2fa {correo}`:** pide confirmación, que se omite
    con `--force`. En una transacción borra el secreto, los códigos de recuperación y la
    confirmación; revoca los dispositivos confiables y, con sesiones en base de datos, cierra
    las sesiones abiertas;
  - la auditoría la deja `AuditObserver` al guardar el usuario, con `usuario_id` nulo desde
    consola; el comando no escribe auditoría a mano;
  - en el siguiente login, el admin debe configurar el 2FA de nuevo (423
    `dos_pasos_requeridos`). Reemplaza al paso con `tinker` del README;
  - **seeders:** `DesarrolloSeeder` y los escenarios imprimen también los 8 códigos de
    recuperación de cada admin;
  - **"recordar dispositivo" para admin pasa de 14 a 30 días por defecto**, en
    `TrustedDeviceService`, la migración de `configuracion_seguridad` (reescrita, DAT-11), la
    factory y el comentario de `TenantObserver`. DS se detuvo porque `TrustedDeviceTest`
    fijaba el 14. **Excepción a PRO-01 autorizada por el responsable:** esa aserción y su
    comentario pasan a 30. La completé en la revisión, con dos tests nuevos que fallaron
    antes del cambio;
  - tests nuevos: `ResetearDosFactorCommandTest` (5), dos métodos en `EscenariosSeederTest`
    y dos en `TrustedDeviceTest`. Backend: 647 tests.
  - Para una BD de desarrollo existente: `migrate:fresh --seed`, porque cambió un default de
    `configuracion_seguridad`.
- **Auditoría de SEG-10, API-05 y SEG-01** (trigésimo segundo encargo, hecho por DS):
  - **fase 1:** un informe con tres tablas, revisado con el responsable. Encontró:
    - permisos y roles sin auditoría;
    - cotizaciones que aceptaban el precio del cliente;
    - 15 huecos de aislamiento entre sucursales del mismo tenant (van en el encargo 32b);
  - **SEG-10:** los `sync()` de `rol_permiso` y `usuario_rol` dejan una sola fila por padre y
    petición, con los ids antes y después. Se declaran en `config/auditoria.php`
    (`pivotes`). Solo se registran con un usuario autenticado; desde consola no. Además,
    `ProductoVariante` pasa a ser auditable;
  - **SEG-10, inventario:** por decisión del responsable, el Kardex es la bitácora de
    inventario;
  - **API-05:** tests de manipulación (ventas, cotizar, apartados, devoluciones, compras),
    que ya pasaban con el código actual;
  - **API-05, cotizaciones:** el precio sale de `PrecioService`. Un precio o descuento manual
    solo se acepta con el permiso nuevo `cotizaciones.precio_manual`, que tiene admin. La
    conversión a venta paga con el total que calcula la venta. En el frontend, sin el
    permiso, los campos de precio y descuento son de solo lectura;
  - tests nuevos: `OperacionesSensiblesTest`, `ManipulacionDePreciosTest`,
    `CotizacionPrecioManualTest` y un spec en `lineas-cotizacion`. Backend: 663 tests; `pos`:
    438. La línea base de PHPStan baja a 1384;
  - para una instalación existente: correr `NucleoRolesPermisosSeeder`, para que aparezca
    `cotizaciones.precio_manual`.
- **Aislamiento por sucursal, SEG-01** (encargo 32b, hecho por DS):
  - **el problema:** un usuario sin `sucursales.todas` veía y operaba ventas, apartados,
    devoluciones, cotizaciones, cuentas, pedidos y cajas de otra sucursal del mismo tenant.
    La auditoría del 32 confirmó 15 huecos, más los listados y las rutas con `{id}` manual;
  - **la corrección:**
    - scope global `Nucleo/Scopes/SucursalScope` con el trait `BelongsToSucursal` y su
      bypass `sinSucursal()`;
    - se aplica a `Venta`, `Apartado`, `Devolucion`, `Cotizacion`, `Pedido`, `CajaSesion`,
      `OrdenProduccion` y `Nomina`;
    - por relación, en `CuentaCobrar` (vía la venta), `CuentaPagar` (vía la compra) y
      `NotaCredito` (vía la devolución);
    - no filtra sin usuario autenticado (consola, jobs, seeders) ni con `sucursales.todas`;
      un usuario sin sucursal no ve nada;
    - kardex y gastos filtran en la consulta con `SucursalOperacion::paraFiltro()`;
    - sin cambios de esquema;
  - **test nuevo `Seguridad/AislamientoBindingTest`:** las 60 rutas con binding contra otro
    tenant, y las rutas operativas, las rutas con `{id}`, los listados, el kardex y los gastos
    contra otra sucursal. Las `EXENTAS` llevan su razón;
  - **excepción a PRO-01 autorizada por el responsable:** la función auxiliar
    `crearModeloParaBinding` de `MatrizPermisosTest` crea los recursos operativos en la
    sucursal del usuario del test. La matriz prueba permisos y el aislamiento lo prueba el
    test nuevo. No se perdió ningún método;
  - backend: 666 tests. Los escenarios de seed (con un tenant multi-sucursal) siguen en verde;
  - **pendiente menor:** el scope consulta `tienePermiso('sucursales.todas')` en cada
    consulta. Si se nota en rendimiento, cachear los permisos del usuario por petición.
- **Guardas de arquitectura y codificación** (trigésimo tercer encargo, hecho por DS): cada
  una tiene una lista de pendientes que solo baja. El test falla si aparece una violación
  nueva o si una entrada de la lista ya cumple o ya no existe:
  - **ARQ-08:** `StrictTypesTest` exige `declare(strict_types=1)` en todo PHP nuevo de
    `app/`, `database/` y `routes/`. Los 594 archivos existentes están en
    `tests/Fixtures/sin-strict-types.txt`, y `arquitectura:strict-types-pendientes` solo
    quita entradas. No se agregó `strict_types` a archivos existentes: entra al reescribir
    cada módulo;
  - **ARQ-01:** `ControllersSinConsultasTest` prohíbe `DB::`, `::query(`, `::where(`,
    `::whereIn(` y `->newQuery(` en los controllers. Hay 28 controllers en `PENDIENTES`;
  - **ARQ-06:** `RutasDeModulosOpcionalesTest` exige `modulo:<slug>` en las rutas de los 11
    módulos opcionales. `UnidadesMedida` queda exenta, con su razón;
  - **DAT-12:** el paso de codificación de CI detecta la doble codificación (`Ã` o `Â`
    seguidos de los bytes típicos), y el comando `php artisan conciliar:texto` la reporta en
    la base, junto con U+FFFD, sin corregir nada. En la revisión se ampliaron los tipos de
    columna para cubrir MySQL (`char`, `tinytext`, `mediumtext`, `longtext`);
  - cada guarda se probó fallando y pasando. Backend: 672 tests.
- **Especificación OpenAPI, API-08 (parte de la Fase 1)** (trigésimo cuarto encargo, hecho por
  DS):
  - **Scramble:** `dedoc/scramble` `^0.13.52`, solo como dependencia de desarrollo, por
    decisión del responsable. `composer audit` sigue sin avisos. La UI de `/docs/api` solo
    está en local (`RestrictedDocsAccess`, sin gate: 403 en producción), y con
    `composer install --no-dev` la app arranca sin ella;
  - **artefacto:** `docs/api/openapi.json` (OpenAPI 3.1.2, 117 rutas, 158 operaciones),
    generado con `php artisan scramble:export`. Es estable entre corridas;
  - **corrección en la revisión:** el campo `servers` queda fijo en
    `config/scramble.php`. Con el valor por defecto, Scramble antepone `APP_URL` y el archivo
    cambiaba según el `.env` de cada máquina;
  - **CI:** el job Backend regenera la especificación y falla con el diff si difiere de la
    versionada;
  - **test nuevo `Arquitectura/EspecificacionOpenApiTest`:** comprueba que el archivo es
    OpenAPI 3.x, que incluye todas las rutas de `api/v1` con `permiso:*` (`EXENTAS` vacía) y
    que `/docs/api` está protegido. Backend: 675 tests;
  - **pendientes:**
    - Scramble emitía 19 avisos al exportar, porque los FormRequests que validan con
      `ReglasTenant` no tienen tenant activo al generar. Se resolvió en el encargo 35, y
      resultó que no faltaba nada en la especificación, que salió idéntica;
    - hay 96 `response()->json` sin esquema propio (API-02);
    - los tipos del frontend generados desde la especificación van en la Fase 2.
- **Respuestas con `JsonResource`, API-02 (parte de la Fase 1)** (trigésimo quinto encargo,
  hecho por DS):
  - **guarda:** `Arquitectura/RespuestasConResourceTest` prohíbe `response()->json(` y los
    arreglos, modelos o variables devueltos directo en los métodos públicos de los
    controllers;
    - hay 92 casos en 38 archivos en `PENDIENTES`, por archivo y con su conteo, que solo baja;
    - `AuthController` queda exento por ser sesión web, fuera de `api/v1`;
    - el patrón de un listado está en el docblock:
      `XResource::collection($items)->additional(['meta' => [...]])`;
    - no se convirtió ningún controller: entran al tocar cada módulo;
  - **Scramble sin avisos:** `SolicitudNegocio::tenantId()` devuelve 0 solo en consola y sin
    ruta (el caso de `scramble:export`), y 0 no coincide con ningún tenant. En una petición
    HTTP sin tenant sigue el 500. `SolicitudNegocioTenantTest` comprueba los dos casos. La
    especificación no cambió;
  - backend: 678 tests.
- **Listados uniformes, API-06** (trigésimo sexto encargo, hecho por DS; cierra la Fase 1):
  - **helper `Nucleo/Support/Listado::aplicar()`:** a partir de una declaración por listado
    (campos ordenables con su orden por defecto, filtros `=`, `like` y rango de fechas, columnas
    de búsqueda para `q` y filtros por defecto) aplica `page`, `rows` (máximo 100), el orden y
    los filtros. Devuelve `meta` con `total`, `page`, `rows`, `filtros_aplicados` y `permisos`;
    el listado responde con `XResource::collection()->additional(['meta' => …])`;
  - **convertidos de referencia:** roles y usuarios. Sus respuestas solo ganan claves en
    `meta`, y los specs del frontend siguen en verde sin cambios;
  - **guarda:** `Arquitectura/ListadosUniformesTest` exige el contrato a todo listado fuera
    de `PENDIENTES` (25, que solo bajan): `meta` completo, `rows=500` ≤ 100, `sort_field`
    inválido con el orden por defecto y `q` que filtra. `RespuestasConResourceTest` baja de 92
    a 90 pendientes;
  - **corrección en la revisión:** un parámetro de listado que llega como arreglo
    (`?q[]=x`) daba 500. Ahora se ignora, con un test que falló antes del cambio;
  - Scramble ya no infiere `sort_field` en esos dos listados, porque la lectura de parámetros
    vive en el helper; se documentará cuando se conviertan los demás;
  - backend: 680 tests.
- **Capas Nx y reglas de lint** (trigésimo séptimo encargo, hecho por DS; primero de la Fase
  2):
  - **ARQ-11:** etiquetas `type:app` (`pos`), `type:ui` (`ui-shared`) y `type:tokens`
    (`design-tokens`). `depConstraints` por capa: app → feature, domain, ui, core, tokens;
    feature → domain, ui, core, tokens (nunca otro feature); domain → core; ui → ui, tokens;
    core y tokens → nada. Un proyecto sin etiqueta falla. Una lib nueva lleva `type:*` y, si es
    feature, `scope:<modulo>`;
  - **SEG-04 y UI-15:**
    - regla propia `nianva/no-inner-html` en `frontend/tools/eslint-rules`, con test en Vitest
      y sin Jest. En la revisión se agregó el paso de CI "Probar reglas de lint propias",
      porque ese test no entra en `nx run-many`;
    - `no-restricted-syntax` contra `bypassSecurityTrust*`;
    - `@angular-eslint/template/no-inline-styles`, con una **excepción temporal** decidida
      por el responsable: `allowBindToStyle` permite los 22 `[style]="{ width }"` de
      `p-dialog` (17 archivos) hasta que `ui-modal` los reemplace en la migración de
      pantallas; después se quita;
  - **ARQ-12:** `HttpClient` prohibido en `*.component.ts`;
  - antes de activar cada regla se midió: 0 violaciones, salvo los 22 `[style]`. Cada regla y
    frontera se probó fallando y pasando con proyectos y componentes temporales;
  - frontend sin cambios: ui-shared 22 y pos 438, más los 4 tests de la regla; los mismos
    warnings de lint.
- **`ui/tokens`, una sola fuente y tema oscuro** (trigésimo octavo encargo, hecho por DS):
  - **lib nueva `libs/ui/tokens`** (`@nianva/ui-tokens`, `type:tokens`): `tokens.json` con
    los primitivos de siempre (mismos valores), los semánticos en claro y oscuro (`fondo`,
    `superficie`, `borde`, `texto`, `texto-suave`, `primario`, los estados con su `-texto`,
    `foco`…), las escalas y los breakpoints `sm` 576, `md` 768, `lg` 992 y `xl` 1200;
  - **generador:** `scripts/generate.mjs`, sin dependencias, escribe `tokens.css`, el preset
    de PrimeNG y `breakpoints.ts`. Su `--check` corre en CI (paso "Verificar tokens
    generados");
  - **compatibilidad:** los 51 `--nucleo-*` de antes son alias de los `--nv-*` y se retiran
    al migrar las pantallas. En la revisión se comprobó que los 51 resuelven al mismo valor
    que en `master`, y que el preset da en claro lo mismo que Aura con la paleta anterior: la
    apariencia en tema claro no cambia;
  - **contraste:** `tokens-contrast.spec.ts` exige 4.5:1 en los pares de texto de los dos
    temas, y todos pasan;
  - **tema oscuro:** `darkModeSelector: '.nv-tema-oscuro'` y `TemaService` (preferencia en
    `localStorage`: claro, oscuro o sistema), sin interruptor visible. **Corregido en la
    revisión, con su test primero:** DS dejó "sistema" como valor por defecto, así que con
    el sistema operativo en oscuro la app se habría visto en un tema oscuro a medias y sin
    forma de salir. Ahora el valor por defecto es claro hasta migrar las pantallas, y el
    acceso a `localStorage` está protegido para modo privado;
  - **retiro:** se eliminó `libs/design-tokens`;
  - frontend: ui-tokens 16, ui-shared 22 y pos 444 tests; los mismos warnings de lint.
- **stylelint y línea base del CSS por pantalla** (trigésimo noveno encargo, hecho por DS):
  - **stylelint 16.26.1** con `postcss-scss`, en CI (paso "Revisar estilos con stylelint"):
    sin hex, colores con nombre, `rgb()`/`hsl()` ni `font-family` que no sea un token
    `--nv-font-family*`; sin `@media` en `apps/**` y `feature/**`. Solo `libs/ui/tokens` queda
    exenta;
  - **las 9 violaciones de hoy**, corregidas sin cambiar la apariencia:
    - 6 `white` dentro de `color-mix()` (en `auth-page` y en el `status-badge` de
      `ui-shared`) pasan a `--nv-color-surface-0`, un primitivo `#ffffff` que no cambia en
      tema oscuro;
    - el `monospace` de los códigos de recuperación pasa a un primitivo nuevo,
      `--nv-font-family-mono`;
    - la sombra de la tarjeta de login pasa a otro primitivo nuevo, `--nv-shadow-tarjeta`, con
      el mismo valor;
    - en `styles.scss`, el `font-family` cambia del alias `--nucleo-*` a su `--nv-*`;
  - **`tools/ui-baseline.mjs`:**
    - cuenta las líneas no vacías de cada `.scss`/`.css` y de los estilos inline de
      componentes en `apps/**` y `feature/**`, y las compara con `frontend/ui-baseline.json`
      (3374 líneas en 112 archivos);
    - `--check` falla si un archivo es nuevo, si sube o si baja sin actualizar la línea base;
    - `--actualizar` solo acepta bajadas;
    - el archivo está en CODEOWNERS;
    - **corregido en la revisión:** los estilos inline escritos como cadena (`` styles: `…` ``)
      no se contaban. Ahora sí, y se probó con un componente temporal;
  - las reglas y el script se probaron fallando y pasando con archivos temporales;
  - frontend: ui-tokens 18 (2 nuevos), ui-shared 22 y pos 444 tests; los mismos warnings. La
    vulnerabilidad moderada de `pnpm audit` (`minimatch`, vía `@nx/*`) ya existía.
- **`--check` de los tokens en Windows** (encargo 39b, hecho por DS):
  - **el fallo:** con `core.autocrlf=true`, Git deja los generados en CRLF, y
    `generate.mjs --check` los daba por desactualizados aunque el contenido era igual. CI, en
    Linux, no lo veía;
  - **la corrección:** la comparación pasa a `scripts/contenido-equivalente.mjs`, con el
    mismo criterio que `ErroresCatalogoCommand::contenidoEquivalente()` del backend, y tiene
    su test, que se vio fallar primero. Un token cambiado sin regenerar sigue fallando;
  - ui-tokens: 20 tests.
- **`ui/format` y reglas de plantilla** (cuadragésimo encargo, hecho por DS):
  - **lib nueva `libs/ui/format`** (`@nianva/ui-format`, `type:ui`):
    - pipes `dinero` (`$1,250.50`), `cantidad` (`1 pza`, `0.5 kg`; el cero va solo, como
      `0`), `porcentaje` (en puntos: `16` → `16%`), `fecha` y `fechaHora` (`dd/MM/yyyy HH:mm`
      en la zona del tenant; una fecha sola no se desplaza);
    - aceptan los decimales como texto de Laravel; un valor vacío o no numérico se muestra
      `—`;
    - `FORMATO_REGIONAL` y `provideFormatoRegional()`, por ahora con los valores por
      defecto del backend (`es-MX`, `$`, `America/Mexico_City`);
  - **`nianva/formato-por-pipe` (UI-05):**
    - un campo con `precio`, `monto`, `total`, `cantidad` o `stock` en una interpolación
      debe terminar en `dinero`, `cantidad` o `porcentaje`;
    - prohíbe `date`, `currency`, `number`, `percent` y `decimal`;
    - 53 archivos quedan en `tools/eslint-rules/formato-pendientes.json`, con la regla
      apagada. Un test falla si alguno ya no la viola, así que la lista solo baja; está en
      CODEOWNERS;
  - **`nianva/sin-color-en-plantilla` (UI-01):** colores literales y clases de color fijo
    (`bg-white`, `text-red-500`) en plantillas. Entró sin pendientes: había 0;
  - **corregido en la revisión, con sus tests primero:**
    - la regla no detectaba `venta?.total`, `obtenerTotal?.()` ni `fila['total']`, y marcaba
      `(x.total | dinero)`;
    - ahora recorre el árbol completo de la expresión. El recorrido no sigue `parent`: si lo
      sigue, cada interpolación "ve" la plantilla entera;
  - frontend: ui-format 11, ui-tokens 20, ui-shared 22 y pos 444 tests; reglas propias 14;
    los mismos warnings.
- **Sesión: 401 en todas las pestañas y reintento ante 419** (encargo 41b, hecho por DS en
  paralelo con el 41a):
  - **`SesionEntrePestanasService`:**
    - un 401 (salvo el `GET /api/v1/user` del arranque) o un logout limpian el estado y avisan
      a las demás pestañas por `BroadcastChannel('nianva-sesion')`. Si no existe, se usa el
      evento `storage`, con solo una marca de tiempo;
    - varios 401 navegan una sola vez, y en una ruta pública no se navega;
  - **`csrfRetryInterceptor`:**
    - un 419 en una petición mutante pide `/sanctum/csrf-cookie` y reintenta una sola vez con
      el token nuevo;
    - va antes de `authInterceptor`, así que un 401 del reintento cierra la sesión;
  - **ajustado en la revisión:**
    - el reintento usa `conTokenXsrf()` de `xsrf.interceptor.ts`, en vez de una copia
      propia;
    - se restauró un comentario que DS había borrado en `auth.service.ts`;
  - **verificación por mutación:** los tests de "una sola navegación" fallan si se quita el
    corte. El de "no reintenta dos veces" pasa aunque se quite la marca: el reintento se lanza
    con `next()` dentro del `catchError`, y por estructura no puede repetirse;
  - **la prueba manual con dos pestañas** (logout en una y borrar la cookie `XSRF-TOKEN`)
    queda para el responsable: DS no tenía navegador;
  - pos: 457 tests.
- **`ui/feedback`: estados, toast y estados de carga** (encargo 41a, hecho por Claude en un
  worktree aparte, en paralelo con el 41b):
  - **lib nueva `libs/ui/feedback`** (`@nianva/ui-feedback`, `type:ui`, selectores `ui-*`):
    - `REGISTRO_ESTADOS`: 13 entidades. El estado normal de cada una (el valor por defecto
      de su columna `estado`) no lleva badge, y un estado desconocido se muestra tal cual en
      tono neutro. `registro-estados.spec.ts` lee las migraciones del backend y falla si un
      enum gana o pierde un valor; se probó quitando un estado;
    - `ui-badge`: etiqueta, tono e icono sacados del registro, con los tokens semánticos
      `--nv-*`;
    - `ToastService` y su host se movieron desde `ui-shared`, que los reexporta, así que los
      113 archivos que lo usan no cambian. Ahora descarta el mismo mensaje repetido dentro de
      1.5 s;
    - `ui-skeleton`, sobre `p-skeleton`, con forma `texto`, `bloque` o `circulo` y
      `role="status"`, y `conUmbral()`, que enciende un indicador a los 300 ms y lo apaga en
      el acto;
  - **`nianva/sin-texto-cargando`:** 66 textos en 37 archivos. Quedan 36 en
    `cargando-pendientes.json`, que solo baja y está en CODEOWNERS;
  - **2FA, primer uso,** con el test primero:
    - el QR muestra su skeleton;
    - si la generación fallaba, el formulario "Confirmar" se mostraba sin QR y sin forma de
      reintentar. Ahora se muestra el error con "Reintentar";
    - "Confirmar" muestra su indicador;
    - el generador del QR entra por el token `GENERAR_QR`, para poder simularlo;
    - no se agregó CSS: la línea base sigue en 3374;
  - frontend: ui-feedback 20, pos 461 tests; reglas propias 19; los mismos warnings.
- **Interceptor global de errores** (encargo 41c, hecho por DS):
  - **alcance, medido antes de decidir:** 83 `toast.error` en 56 archivos, casi todos con un
    texto fijo ante cualquier error, y 144 bloques `error:` en 84 archivos. El interceptor
    se queda con los errores técnicos; los 4xx de negocio y de validación siguen en cada
    pantalla hasta la migración;
  - **`erroresInterceptor`** (`core/`, el último en `withInterceptors`):
    - sin conexión (`status 0`), 403 y 5xx → un toast con
      `ToastService.errorTecnico()`; en 5xx incluye el `correlation_id` como "Código de
      soporte" (SEG-11);
    - 401, 419 y los demás 4xx no se tocan, y el error siempre llega al que llamó;
  - **un solo toast (UI-13):** durante 1.5 s después de un error técnico, `ToastService`
    descarta los `error()` de la pantalla, así que los 56 archivos con su propio toast no
    duplican el mensaje;
  - **`ERROR_EN_PANTALLA`** marca las peticiones de las pantallas que muestran el error en
    la página: reset de contraseña, verificación y configuración del 2FA, cambio de
    contraseña y desactivar el 2FA de un usuario;
  - **ajustado en la revisión:**
    - DS había marcado también `UsuarioAdminService.actualizar`, pero esa pantalla solo
      muestra un toast genérico, así que un 500 habría perdido su `correlation_id`. Se le
      quitó la marca;
    - se restauraron los comentarios de `AuthService` y `SeguridadService` que DS había
      borrado;
  - **verificación por mutación:** quitar la ventana de descarte o ignorar la marca hace
    fallar sus tests;
  - frontend: ui-feedback 24, pos 467 tests.
- **`ui/actions`: crear, exportar y acciones por fila** (encargo 42a, hecho por DS en
  paralelo con el 42b):
  - **lib nueva `libs/ui/actions`** (`@nianva/ui-actions`, `type:ui`):
    - `ui-btn-crear`: "Nuevo/Nueva <objeto>", con `ruta` o la salida `(crear)`;
    - `ui-btn-exportar`: "Exportar", con un indicador por `conUmbral()`;
    - `ui-row-actions`: las acciones son solo de icono, porque el tipado no acepta texto;
      `descripcion`, en las propias, va solo en `title` y `aria-label`;
  - **orden y apariencia de `ui-row-actions`:**
    - el componente fija el orden: ver, editar, imprimir, historial, las propias, estado,
      eliminar y anular. También fija los iconos y el tono, que es de peligro en eliminar y
      anular;
    - con más de 3 acciones se muestran 2 y el resto va en un menú ⋮;
    - una acción deshabilitada muestra su motivo en el tooltip y en el `aria-label`, y no
      emite nada;
  - **verificación por mutación, en la revisión:**
    - si el tipo admite una `etiqueta`, la compilación falla (TS2578 del
      `@ts-expect-error`);
    - si se altera el orden, fallan el test de orden y el de salida;
  - DS no mostró los tests fallando antes de implementar;
  - ui-actions: 15 tests.
- **`ui/layout`: registro de navegación, encabezado y estados de página** (encargo 42b,
  hecho por Claude en un worktree aparte, en paralelo con el 42a de DS):
  - **lib nueva `libs/ui/layout`** (`@nianva/ui-layout`, `type:ui`, selectores `ui-*`):
    - el contrato del registro: `EntradaNavegacion` (`clave`, `ruta`, `nombre`, `icono` y,
      opcionales, `permiso` y `feature`), `REGISTRO_NAVEGACION` y `problemaDeNombre()`, que
      comprueba UI-08 y permite siglas como CxC o CRM;
    - `ui-page-header`: nombre e icono por `clave`; no tiene entrada de título, y un test lo
      comprueba. Una clave que no está en el registro falla;
    - `ui-page`: `cargando` muestra un skeleton con la forma de un listado, un detalle o un
      formulario; `error`, el mensaje con "Reintentar"; `listo`, el contenido;
    - `ui-section` y `ui-form-actions`;
  - **registro de la app:** `REGISTRO_NAVEGACION_POS` sale de `NUCLEO_NAV_GROUPS`, el mismo
    menú del sidebar. Así hay una sola fuente;
  - **`registro-navegacion.spec.ts`,** visto fallando primero. Comprueba:
    - los nombres;
    - que no haya claves ni rutas repetidas;
    - que cada entrada lleve a una pantalla con componente, siguiendo redirecciones;
    - que dos entradas no lleven a la misma pantalla;
    - que toda pantalla raíz del shell tenga entrada o una razón en `SIN_ENTRADA`;
  - **lo que encontró:**
    - 8 nombres con mayúsculas a mitad ("Cuentas por Cobrar", "Gift Cards"…). Se corrigieron
      en el registro y, para que coincidan, en los títulos, las migas de pan y siete `<h1>`;
    - "Gastos" no tiene pantalla: redirige a Caja, así que el menú mostraba la misma
      pantalla con dos nombres. **Decisión del responsable:** se quita del menú, porque los
      gastos se registran en Caja. `/gastos` sigue redirigiendo para no romper enlaces;
    - `gift-cards/emitir` y `cotizaciones/crear` no siguen la ruta `/modulo/nuevo`. Quedan
      en `SIN_ENTRADA` hasta la migración;
  - **fuera de este encargo:**
    - el shell responsivo;
    - el título del navegador desde el registro, que implica reescribir más de 100 `title`
      de `app.routes.ts`;
    - los permisos y features de cada entrada;
  - frontend: ui-layout 15, pos 472 tests; los mismos warnings.
- **`ui/data`: tabla tipada, barra de filtros y estado vacío** (encargo 43, hecho por DS en
  paralelo con el 42c):
  - **lib nueva `libs/ui/data`** (`@nianva/ui-data`, `type:ui`):
    - el contrato de API-06: `MetaListado`, `CambioListado` y `parametrosListado()`, que
      arma el query sin vacíos y limita `rows` a 100;
    - columnas tipadas: una unión discriminada por `tipo` (`texto`, `principal` con
      `apoyo`, `dinero`, `cantidad`, `porcentaje`, `fecha`, `fechaHora`, `estado` y
      `acciones`), con `campo: keyof T`, verificado con `@ts-expect-error`;
  - **`ui-tabla`,** sobre `p-table` lazy:
    - formato con `ui/format`, números a la derecha con `tabular-nums` y dinero negativo en
      tono de peligro;
    - `ui-badge` en la columna `estado` y fila inactiva atenuada con "Inactivo";
    - `ui-row-actions` en la columna de acciones, sin clic en la fila;
    - un skeleton de filas en la primera carga, y en una recarga los datos se conservan con
      el indicador (`conUmbral`);
    - `ui-empty` cuando no hay filas, y paginación de 25, 50 y 100;
  - **`ui-filter-bar`** ("Mostrando X–Y de Z" y "Limpiar") y **`ui-empty`**;
  - **corregido en la revisión, con su test primero:**
    - las acciones de la columna eran un arreglo fijo, igual para todas las filas, así que
      no se podía mostrar Activar o Desactivar según la fila ni deshabilitar una acción en
      una fila concreta. Ahora son `(fila) => AccionFila[]`, como pedía el encargo;
    - se agregó el test de que el estado normal no pinta badge;
  - DS no mostró los tests fallando antes de implementar; su reporte no trajo la API ni los
    conteos por proyecto;
  - ui-data: 23 tests.
- **`ui/forms`: inputs y errores por campo** (encargo 44a, hecho por DS en paralelo con el
  43b):
  - **lib nueva `libs/ui/forms`** (`@nianva/ui-forms`, `type:ui`). Todos los inputs son
    `ControlValueAccessor` y respetan `disabled`:
    - `ui-input-dinero`: 2 decimales, sin negativos salvo `permitirNegativo`, con `min` y
      `max`; formato de `ui/format` al salir y número limpio al editar; el valor es
      `number | null`;
    - `ui-input-cantidad`: `decimales` de 0 a 3, con `unidad` como sufijo;
    - `ui-input-password`: botón de ojo con `aria-pressed`;
    - `ui-input-pin` (SEG-12): de 4 a 6 dígitos, sin `input[type=password]`, con teclado
      físico y táctil, `(completo)` y `limpiar()`;
    - `ui-select-filtro`: "Todas" equivale a `null`;
  - **`ui-campo` y errores del servidor:**
    - `ui-campo` lleva la etiqueta, el `*` y el error. Lee el control con `NgControl` y lo
      comparte con los inputs por un token, para evitar la dependencia circular de un CVA
      que inyecta `NgControl`;
    - `aplicarErroresServidor()` usa `erroresValidacion()`, que se agregó a
      `ui-shared/errores`, y `ui-campo` quita el error al editar;
  - **corregido en la revisión, con su test primero:**
    - el `id` del control se armaba solo con el nombre del campo, así que dos formularios
      en la misma página (una pantalla y su modal) repetían `id` y rompían `label for` y
      `aria-describedby`. Ahora lleva un contador;
    - faltaban acentos en los mensajes ("más", "inválido"), y faltaba el comentario de
      `erroresValidacion()`;
  - **verificación por mutación:**
    - si el dinero acepta 3 decimales, falla su test;
    - si el PIN usa `type="password"`, falla el suyo;
  - DS no tenía la salida en rojo previa, y lo dijo;
  - ui-forms: 26 tests.
- **`ui/overlays`, confirm, `ui-alert` y botón de envío** (encargo 44b, hecho por DS en
  paralelo con el mantenimiento de los timeouts):
  - **lib nueva `libs/ui/overlays`** (`@nianva/ui-overlays`, `type:ui`):
    - `ui-modal` (sobre `p-dialog`) y `ui-drawer` (sobre `p-drawer`, desde la derecha);
    - entradas `visible` (`model`), `titulo` y `tamano`, más la salida `(cerrado)`;
    - las acciones van en `[acciones]`, dentro de `ui-form-actions`;
    - se cierran con Escape y con el botón, y el foco vuelve al elemento que los abrió;
    - en pantalla angosta (`PantallaService`) ocupan la pantalla completa;
  - **en `ui/feedback`:**
    - `ConfirmDialogService` y su host se movieron desde `ui-shared`, que los reexporta, así
      que sus 54 usos no cambian;
    - `confirmarEliminacion()` es nuevo y siempre usa el tono de peligro;
    - `ui-alert` cubre los avisos fijos, con `role="alert"` o `role="status"` según el tono;
  - **en `ui/forms`:** `ui-btn-enviar` se deshabilita en el acto y muestra su indicador
    pasado el umbral;
  - **corregido en la revisión:**
    - los overlays daban el ancho con `[style]="estilo()"`. Así, ellos mismos habrían roto
      el lint al quitar `allowBindToStyle`, que es justo la excepción que existen para
      retirar. Ahora usan clases (`claseOverlay()` y `overlays.scss`, sin encapsulación,
      porque PrimeNG pinta el contenedor fuera del componente). Un test comprueba que la
      clase llega al `.p-dialog`;
    - en `eslint.config.mjs`, `no-inline-styles` queda estricta para `libs/ui/**/*.html`,
      con la opción explícita: un override que solo cambia la severidad conserva
      `allowBindToStyle: true`. Se vio fallar en los overlays antes del cambio;
  - **verificación por mutación:** con umbral 0, falla el test del indicador de
    `ui-btn-enviar`;
  - **visto en la revisión:** ESLint corrido a mano desde la carpeta de un proyecto no
    aplica los patrones relativos a `frontend/` (pendientes y overrides). Nx y CI lo corren
    desde la raíz, donde sí se aplican;
  - DS no tenía la salida en rojo previa;
  - ui-overlays 8, ui-feedback 32 y ui-forms 29 tests.
- **Shell responsivo y título del navegador** (encargo 42c, hecho por Claude en un worktree
  aparte, en paralelo con el 43 de DS):
  - **`ui-shell`** (en `ui/layout`, porque stylelint no permite `@media` en `apps/**`):
    - menú, encabezado y contenido. `PantallaService` da la señal `angosta`, por debajo de
      `md`. ui-tokens no se compila como lib, así que el ancho entra por
      `ANCHO_PANTALLA_MD`, y un test lo compara con `breakpoints.md`;
    - en pantalla angosta, el menú sale del flujo y es un panel que abre el botón ☰
      (`aria-expanded`, `aria-controls`). Se cierra al navegar, con Escape, tocando fuera
      o al pasar a pantalla ancha. Mientras está cerrado queda `inert` y `aria-hidden`;
    - el `ShellLayoutComponent` de la app usa `ui-shell` y ya no tiene CSS: la línea base
      bajó de 3374 a 3351 líneas;
    - **corregido tras la prueba del responsable a 375 px:** dentro del panel seguía el
      botón de colapsar del sidebar, que lo dejaba solo con iconos. En pantalla angosta ese
      botón no se muestra y el sidebar se ve siempre completo. Al volver a pantalla ancha se
      respeta otra vez la preferencia de colapsado (`sidebar-pantalla-angosta.spec.ts`,
      visto fallando primero);
  - **`TituloDesdeRegistro`:** una pantalla del menú toma su título del registro
    (`Núcleo · <nombre>`); las demás (detalle y alta) usan el `title` de su ruta;
  - **en la app,** con el test primero (`titulo-de-pantallas.spec.ts`):
    - las entradas `inventario` y `crm` apuntaban a una redirección; ahora van directo a
      `inventario/productos` y `crm/clientes`;
    - se quitaron los 37 `title` de las pantallas del registro. En los reportes, la pestaña
      dice ahora "Antigüedad de CxC" en vez de "Reporte de Cuentas por cobrar", como el
      menú;
  - **fuera de este encargo:** los permisos en el menú. El usuario no trae su lista de
    permisos (cada listado los devuelve en `meta.permisos`), así que va con API-09 en el
    encargo 45;
  - frontend: ui-layout 26 y pos 477 tests; los mismos warnings.
- **Generador `ui-listado`** (encargo 43b, hecho por Claude en un worktree aparte, en
  paralelo con el 44a de DS):
  - **plugin local `@nianva/generadores`** (`frontend/tools/generadores`, proyecto
    `type:core`): se resuelve por su alias en `tsconfig.base.json` y no depende de
    `@nx/devkit`, porque escribe con el `tree` que le pasa Nx;
  - **`pnpm nx g @nianva/generadores:ui-listado`:**
    - opciones: `entidad`, `plural`, `modulo`, `clave`, `endpoint` y `genero`;
    - crea el tipo de la fila, el servicio (`listar()` con el contrato de API-06, usando
      `RespuestaListado<T>`, que se agregó a `ui-data`) y el componente con su spec;
    - la plantilla sigue UI-09: `ui-page-header` con `ui-btn-crear`, `ui-filter-bar` con
      búsqueda, `ui-tabla` con Ver, Editar y Estado por fila, dentro de `ui-page` para el
      error con "Reintentar";
    - no sobrescribe archivos e imprime lo que falta a mano: la ruta, la entrada del
      registro y `nx sync`;
  - **verificación:**
    - 6 tests (`tools/generadores`, nuevo paso de CI "Probar generadores"). Pasan la
      plantilla por las reglas de lint propias, y se comprobó por mutación que el de "no
      sobrescribe" falla si se quita la protección;
    - se generó una pantalla real en un módulo temporal: con `nx sync`, `pos` pasó lint,
      build y test, con 3 tests generados más (480). Después se borró;
  - `.claude/CLAUDE.md` §6 dice cómo crear un listado nuevo.
- **Mantenimiento: timeouts de los specs de `pos` bajo carga** (hecho por Claude en un
  worktree aparte, en paralelo con el 44b de DS):
  - **síntoma:** en casi cada corrida completa fallaban entre 5 y 10 specs de detalle y de
    listado, y al correrlos solos pasaban siempre;
  - **medición:**
    - sin carga, ningún test pasa de 1.5 s y solo 5 pasan de 1 s. Son los primeros tests de
      los specs que montan `RecordTabs` y PrimeNG;
    - el costo está en el `beforeEach` asíncrono (`compileComponents`);
    - con la máquina cargada (run-many en paralelo, el servidor de desarrollo u otra sesión
      corriendo tests), ese paso llegó a 5–11 s;
    - los fallos encajan con los dos límites por defecto de Vitest: `testTimeout` de 5 s
      (fallos de 5.5–6.5 s) y `hookTimeout` de 10 s (fallos de 10–11 s, que Vitest atribuye
      al primer test);
  - **arreglo:**
    - `apps/pos/vitest.config.mts` con `testTimeout: 15000` y `hookTimeout: 30000`,
      conectado con `runnerConfig` en el target `test`;
    - se comprobó que el builder lee el archivo: con 1 ms fallaron los specs en masa;
    - con los valores reales pasan los 477 tests y la corrida completa de los 9 proyectos;
  - **no se pudo reproducir a voluntad,** ni con tres corridas de `pos` en simultáneo. El
    margen cubre el peor caso observado (11.3 s).
- **`GET /api/v1/sesion` y el menú por permisos** (encargo 45a, hecho por Claude en un
  worktree aparte, en paralelo con el 47 de DS):
  - **backend, con el test primero** (`Nucleo/SesionTest`, 11 tests):
    - `GET /sesion` devuelve el usuario (con `UsuarioResource`, la misma forma que `/user`),
      la sucursal, los permisos, los módulos activos y la configuración regional;
    - **permisos:** `Usuario::nombresPermisos()` es nuevo y lista los nombres ordenados; el
      superadmin recibe todos, igual que en `tienePermiso()`;
    - **módulos:** salen de `configuracion_tenant.modulos_activos` con
      `ModuloActivo::activos()`, extraído del middleware para que el menú y el `modulo:`
      apliquen la misma regla. La columna `features` del plan existe pero nada la lee; los
      planes y sus límites son de la Fase 7;
    - **regional:** `moneda` y `zona_horaria` de la configuración del tenant, y `locale`
      derivado de `tenants.pais` (no hay columna de locale);
    - `terminal` y `perfil_giro` van en `null`: no existen todavía (Fase 4 y Fase 7);
    - va fuera de `two-factor.confirmed`, como `/user`, y está en `EXENTAS` de
      `RutasConPermisoTest`;
    - la lógica está en `Aplicacion/Sesion/ObtenerSesion` y la forma en
      `Nucleo/Dtos/SesionDto`, para que Scramble infiera el esquema completo;
      `docs/api/openapi.json` se regeneró;
    - se agregaron `@property` a `Sucursal`, `Permiso` y `ConfiguracionTenant`, y genéricos a
      las relaciones de `Usuario`. La línea base de PHPStan bajó de 1384 a 1379;
  - **frontend:**
    - `AuthStateService.initialize()` pide `/sesion` en vez de `/user`;
    - `SesionActualService` guarda la sesión en señales;
    - `CargaSesionService` la pide tras el login o el 2FA, que solo traen el usuario;
    - el interceptor de 401 también exime `/sesion`;
    - `FORMATO_REGIONAL` toma la moneda, la zona horaria y el locale de la sesión, con
      getters (`provideFormatoRegionalDeSesion`);
    - el menú oculta las entradas sin permiso o con su módulo apagado, y los grupos que
      quedan vacíos. Cada entrada declara el `permiso` del GET con el que carga su
      pantalla, y un test lee el seeder y `ModuloActivo` del backend para que no haya
      erratas;
    - verificación por mutación: si se ignora el módulo, fallan dos tests;
  - **el menú solo oculta:** la autoridad sigue siendo el backend;
  - backend 691 tests (11 nuevos); pos 496 (19 nuevos).
- **`ui/report`: plantilla de reporte** (encargo 47, hecho por DS en paralelo con el 45a):
  - **lib nueva `libs/ui/report`** (`@nianva/ui-report`, `type:ui`):
    - `ui-report`: encabezado (`ui-page-header`) con `ui-btn-exportar`, estados con
      `ui-page` y espacios `[filtros]`, `[kpis]`, `[grafica]` (sin hueco si no viene) y
      `[detalle]`. No calcula cifras: llegan de la capa de métricas (ARQ-09, Fase 6);
    - `ui-report-filtros`: rango de fechas en `YYYY-MM-DD` sin desfase de zona, y sucursal
      con selector solo con `puedeElegirSucursal`;
  - **en `ui/feedback`:** `ui-kpi`, con el formato de `ui/format` y la variación con tono,
    flecha y texto para lectores de pantalla;
  - **en `ui/data`:** `ui-tabla` acepta `totales` y pinta una fila de pie. Sin `totales` no
    cambia nada;
  - **corregido en la revisión, con su test primero (SEG-02):** sin `sucursales.todas` y sin
    `sucursalUsuario`, el filtro tomaba la primera sucursal de la lista como la del usuario,
    y mostraba y enviaba una ajena. Ahora muestra "Tu sucursal" y manda `null`, para que el
    backend use la del usuario (`SucursalOperacion::paraFiltro`);
  - **pendiente para la Fase 6:** la librería de gráficas (no hay ninguna instalada), la
    capa de métricas, el generador `ui-reporte` y migrar los 4 reportes;
  - DS no tenía la salida en rojo previa;
  - ui-report 11, ui-feedback 37 y ui-data 25 tests.
- **Pendientes detectados:**
  - el aviso "Invalid PrimeUI License" aparece en toda la app y viene de la base heredada
    (nucleo-erp-base). Hay que revisar qué componente, tema o paquete de PrimeNG pide
    licencia, y retirarlo o configurarlo;
  - `FORMATO_REGIONAL` ya lee la configuración del tenant (45a), pero si `moneda` es un código
    como `USD`, `dinero` da `USD1,250.50`, sin espacio;
  - las libs de feature aún no existen. Los patrones `feature/**` de `stylelint.config.mjs` y
    de `ui-baseline.mjs` apuntan a `frontend/feature/`. Al crear la primera, se ajustan a su
    ruta real;
  - `Produccion` usa `UnidadMedida` (extensión → extensión); las unidades se rediseñan en la
    Fase 3 (DAT-01);
  - permisos de acción distinta que son intencionales: `desactivar` con `.eliminar` y los
    catálogos de apoyo;
  - ~~la suite de `pos` tuvo timeouts bajo carga~~, resuelto en el mantenimiento de los
    timeouts, más arriba;
  - `VentaController` y `CompraController` toman el tenant de `$request->user()` y el resto
    de `TenantContext` (equivalentes); se unifica al migrar a FormRequest (C8).
- **Git:** `master` está protegido (ruleset `proteger-master`): todo entra por PR con los tres
  checks en verde.

## 6. Siguiente paso, en orden

1. **Saneamiento de la Fase 1: cerrado el 2026-11-02.** Las 35 filas de la Fase 1 en
   [SEGUIMIENTO_FASES.md](SEGUIMIENTO_FASES.md) están en Hecho. El 2026-11-01 se revisaron
   contra el repo todas las reglas "Desde: Fase 1", y la lista de abajo fue lo que faltaba.
   Hecho: CI con ambas
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
   2. ~~errores 500 sin detalles internos y con `correlation_id` (SEG-11); `storage/` fuera
      del docroot, con sus tests (SEG-08)~~, hecho en el encargo 29;
   3. ~~`migrate:rollback` en CI y snapshot del esquema (DAT-11); `zona_horaria` en la
      configuración del tenant (DAT-06)~~, hecho en el encargo 30;
   3b. ~~2FA: comando `usuarios:resetear-2fa`, códigos de recuperación en los seeders y 30
       días por defecto para admin~~, hecho en el encargo 31. El 2FA sigue siendo obligatorio
       para admin; lo que quita la fricción en tiendas chicas es el PIN de caja (SEG-12,
       Fase 4);
   4. ~~auditar y completar los tests de SEG-10, API-05 y SEG-01~~, hecho en los encargos 32
      y 32b;
   5. ~~guardas de ARQ-08, ARQ-01 y ARQ-06~~, hecho en el encargo 33;
   6. ~~DAT-12: doble codificación en CI y `conciliar:texto`~~, hecho en el encargo 33;
   7. ~~especificación OpenAPI generada y su diff en CI (API-08, parte de la Fase 1)~~, hecho
      en el encargo 34;
   8. ~~regla "los controllers devuelven `JsonResource`", con `PENDIENTES` (API-02, parte de
      la Fase 1)~~, hecho en el encargo 35;
   9. ~~contrato común de listados, con `PENDIENTES` (API-06)~~, hecho en el encargo 36.

   Decisiones del responsable (2026-11-01):
   - de API-02, el dinero y las cantidades como cadena pasan a la Fase 3, con DAT-02;
   - de API-08, los tipos generados en el frontend pasan a la Fase 2;
   - la rama principal sigue siendo `master`: no se renombra a `main`.

   Quedan para fases posteriores:
   - stylelint (PRO-05) pasa a la Fase 2;
   - después de C8: que los Services reciban DTOs en vez de arreglos (se hace al reescribirlos
     en las Fases 3 a 5); `RequiereDosFactorReciente` sigue validando dentro del middleware.
2. **Fase 2: sistema de diseño, en curso.** Sus filas están en `SEGUIMIENTO_FASES.md`.

   **Punto de partida (2026-11-02):**
   - dos libs, `design-tokens` y `ui-shared` (9 componentes), que se reemplazan por las
     `libs/ui/*` de `05_ui_sistema_diseno.md`;
   - ninguna lib ni app tiene etiquetas Nx;
   - 110 componentes y 112 SCSS de pantalla (3970 líneas); ningún color hex, `@media`,
     `innerHTML` ni `HttpClient` en componentes;
   - modo oscuro apagado (`darkModeSelector: false`) y 62 usos del pipe `date` de Angular.

   **Encargos, en orden**, un tema por PR:
   1. ~~capas Nx con etiquetas y `enforce-module-boundaries`, y lint de SEG-04, UI-15 y
      ARQ-12~~, hecho en el encargo 37;
   2. ~~`ui/tokens`: un JSON del que salen las variables CSS, el preset de PrimeNG y los
      breakpoints; tema oscuro; test de contraste (UI-01, UI-03, UI-04)~~, hecho en el
      encargo 38;
   3. ~~stylelint bloqueante y `ui-baseline.json` del CSS por pantalla, que solo baja (PRO-05,
      UI-16)~~, hecho en el encargo 39;
   4. ~~`ui/format`: pipes de dinero, cantidad, fecha, fecha y hora, y porcentaje, más la regla
      de ESLint de plantillas (UI-05) y la de colores literales y clases de color fijo en
      plantillas (UI-01)~~, hecho en el encargo 40;
   5. `ui/feedback`, en tres PRs:
      - ~~41a: registro de estados, badge, toast único, `ui-skeleton` y la regla de lint sin
        "Cargando…" literal (UI-06, UI-13, UI-18), con el QR del 2FA como primer uso~~,
        hecho;
      - ~~41b: 401 en todas las pestañas y reintento ante 419 (SEG-06)~~, hecho;
      - ~~41c: interceptor global de errores sobre el toast (ARQ-12, UI-13)~~, hecho para
        los errores técnicos. Los 4xx de negocio pasan al interceptor con la migración de
        pantallas;
   6. `ui/layout` y `ui/actions`, en tres PRs:
      - ~~42a: `ui-btn-crear`, `ui-btn-exportar` y `ui-row-actions` (UI-07)~~, hecho por DS;
      - ~~42b: registro de navegación, `ui-page-header`, `ui-page` con carga y error,
        `ui-section` y `ui-form-actions` (UI-08, UI-18)~~, hecho;
      - ~~42c: shell responsivo y título del navegador desde el registro (UI-04, UI-08)~~,
        hecho. Los permisos del menú pasan al 45, con API-09;
   7. `ui/data`, en dos PRs:
      - ~~43: `ui-tabla` tipada, `ui-filter-bar` sobre el `meta` de API-06 y `ui-empty`
        (UI-09, UI-05, UI-06, UI-18)~~, hecho;
      - ~~43b: el generador de Nx `ui-listado` (UI-09)~~, hecho;
   8. `ui/forms` y `ui/overlays`, en dos PRs:
      - ~~44a: inputs de dinero, cantidad, contraseña y PIN, `ui-campo` y errores por campo
        (UI-11, componente de SEG-12)~~, hecho;
      - ~~44b: `ui-modal` y `ui-drawer`, `confirm` en tono de peligro, `ui-alert` y
        botones de envío con indicador (UI-13, UI-18)~~, hecho. `allowBindToStyle` se
        retira de las pantallas en la migración;
   9. contrato y sesión, en dos PRs:
      - ~~45a: `GET /sesion` con permisos, módulos y formato regional, y el menú filtrado
        (API-09)~~, hecho;
      - 45b: tipos generados con **openapi-typescript** desde `docs/api/openapi.json` en las
        libs `domain/*`, sin interfaces escritas a mano (API-08 del frontend);
   10. catálogo visual `catalogo-ui`, regresión visual con **Playwright** (claro, oscuro y 375,
       768 y 1280 px) y axe (UI-14, UI-03, UI-17);
   11. ~~`ui/report`, solo el componente (UI-10)~~, hecho en el encargo 47;
   12. migración de **las 110 pantallas** a `libs/ui`, en lotes por módulo, que también
       reemplaza los 35 textos "Cargando…" por los estados de carga (UI-18). Los congelados
       van con cambio mínimo. Al terminar se retiran `design-tokens` y `ui-shared` (C10, UI-02
       y UI-16).

   **Regla nueva UI-18 "Estados de carga"** (2026-11-02, a pedido del responsable): skeleton en
   la primera carga, indicador en el botón que envía y error con "Reintentar". Al aprobarla
   había 35 textos "Cargando…", 22 detalles con `@if (cargando())` en texto y ningún skeleton.

   **Decisiones del responsable (2026-11-02):**
   - se migran todas las pantallas dentro de la Fase 2;
   - la regresión visual se hace con Playwright;
   - los tipos se generan con openapi-typescript, sin runtime, y los servicios de `domain/*`
     siguen usando `HttpClient` tipado.

   Los impresos (UI-12) y la accesibilidad del TPV son de la Fase 4.

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
