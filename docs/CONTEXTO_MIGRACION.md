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
- El `README.md` actual describe el repo como "núcleo que cada vertical clona". Eso **ya no
  aplica**, y se reescribe en la Fase 1.

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
| 2 | Sistema de diseño `libs/ui/*` (tokens, formato, layout, acciones, datos, feedback, overlays, forms, print) y catálogo visual | — |
| 3 | Catálogo (variante = SKU con precio y costo heredables, atributos genéricos, unidades y presentaciones, impuestos), inventario por libro y `PricingService` | — |
| 4 | TPV, terminales, sesiones de caja, folios por serie e impresos | — |
| 5 | Apartados, devoluciones y cambios, crédito (libro), cotizaciones, compras (sugieren el precio), cuentas por pagar y gastos | — |
| 6 | Capa de métricas y reportes | — |
| 7 | Perfiles de giro, planes del tabulador, licencia firmada | — |
| 8 | Entornos: escritorio, LAN, servidor, SaaS; instalador y actualizador | — |
| 9 | ETL del cliente de ropa (Lite → nueva base), ensayo y corte | — |
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
  worker. No se cambió nada; si reaparece en CI, se abre un encargo con esa evidencia. Quedan 6
  specs que llaman `vi.useFakeTimers()` sin restaurar (`usuarios-list`, `metodos-pago-list`,
  `roles-list`, `clientes-list`, `categorias-list`, `departamentos-list`); no se comprobó que
  afecten a otros archivos.
- **Línea base para los siguientes encargos** (medida por DS):
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
- **Pendientes detectados:**
  - dependencias fuera del grafo: `Crm` lee `Venta` de Tpv (`PlanPagoController`,
    `PlanPagoCliente`, `VentasPlazosService`; es un ciclo, porque Tpv → Crm);
    `CajaController::actual()` usa `GastoService`; `Produccion` usa `UnidadMedida`
    (extensión → extensión). Las unidades se rediseñan en la Fase 3 (DAT-01);
  - el frontend no conoce los 9 códigos nuevos (`tpv-error.types.ts` y similares);
  - `VentaController` y `CompraController` toman el tenant de `$request->user()` y el resto
    de `TenantContext` (equivalentes); se unifica al migrar a FormRequest (C8).
- **Git:** `master` está protegido (ruleset `proteger-master`): todo entra por PR con los tres
  checks en verde.

## 6. Siguiente paso, en orden

1. **Saneamiento de la Fase 1**, en encargos de un tema cada uno. Hecho: CI con ambas
   suites, C1 (D4), las validaciones de negocio (500 → 422) y las reglas `exists` con
   tenant (API-05), la unicidad con tenant (DAT-09, C4) y C11 (D5). Orden sugerido para lo
   que sigue: Pint y ESLint bloqueantes en CI (con la línea base de arriba) y PHPStan;
   después el resto:
   - nombres internos: composer `nianva/pos` y alcance Nx `@nianva/*` (hoy `laravel/laravel`
     y `@org`); el nombre de la app Nx `nucleo-shell` queda por decidir;
   - `README.md` nuevo: producto único por planes y giros, derivado de `nucleo-erp-base`;
   - resolver los conflictos C1-C11 del README de estándares;
   - análisis estático en CI (Pint, ESLint, PHPStan, `tsc`; PRO-05);
   - prefijo `/api/v1` y configuración del frontend en tiempo de ejecución (sin
     `localhost:8000` fijo);
   - FormRequests, factories, `preventSilentlyDiscardingAttributes`;
   - actualizar `.claude/CLAUDE.md` para que resuma los estándares;
   - opcional: rama `master` → `main`.
2. **Fase 2**: sistema de diseño.

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
- `.claude/CLAUDE.md`: reglas de módulos vigentes salvo donde choquen con los estándares (C1,
  C11); se reescribe en el saneamiento;
- `docs/MANUAL_TECNICO.md`, `docs/nucleo_arquitectura.md`, `docs/API_SPECIFICATION.md`,
  `docs/consideraciones_futuras.md`, `docs/01_ARQUITECTURA_BASE.md`,
  `docs/02_CONTRATO_API.md`, `docs/03_ESPECIFICACION_BACKEND.md`,
  `docs/04_ESPECIFICACION_FRONTEND_UX.md` y `docs/ANALYSIS_AND_BLUEPRINT.md`: referencia del
  porqué de lo construido (del 01 al 04 y el blueprint, revisar en el saneamiento si se
  conservan o se archivan). Donde contradigan un estándar aprobado, gana el estándar.
