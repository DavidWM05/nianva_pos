# Núcleo — reglas de arquitectura

Instrucciones accionables para trabajar en este repo. Es un resumen, no la referencia
completa — el razonamiento detrás de cada regla vive en
[docs/MANUAL_TECNICO.md](../docs/MANUAL_TECNICO.md); léelo si necesitas el porqué, no lo
repitas aquí.

> **Estándares aprobados (2026-10-30):** [docs/estandares/](../docs/estandares/README.md) manda
> sobre este archivo. La orquestación en Controller y el mapa central de `error_code` ya se
> retiraron (C11 y C1; ver §2 y §3). Este archivo se reescribe en el saneamiento de la
> Fase 1.

## 1. Módulos y dirección de dependencia (nivel `Services`)

Los 10 módulos: Núcleo, Auditoría, Inventario, Precios, CRM, Tpv, Apartados, Devoluciones,
Gastos, Configuración — cada uno en `backend/app/Modules/<Modulo>`.

Dependencias permitidas entre `Services`, y solo estas:

- `Precios` → `Inventario`
- `Tpv` → `Crm` + `Inventario` + `Precios`
- `Apartados` → `Crm` + `Inventario` + `Precios` + `Tpv`
- `Devoluciones` → `Inventario` + `Tpv`
- `Gastos` → `Tpv`, pero **solo `Model`/`Exception`, nunca `Service`**
- `Núcleo`, `Auditoría`, `Configuración`: sin dependencias de negocio salientes. Cualquier
  módulo puede usar sus utilidades transversales (`TenantContext`, middleware `permiso:*`,
  `AuditObserver` vía config, `ConfiguracionTenant`) y las reglas de validación publicadas
  en `<Modulo>\Support\Reglas*` sin que eso cuente como dependencia de negocio.
- **Módulos de extensión** (Cotizaciones, Delivery, CuentasCobrar, CuentasPagar,
  CrmAvanzado, GiftCards, NotasCredito, Produccion, Payroll, Prestamos, UnidadesMedida):
  pueden depender de los módulos base de arriba, nunca entre sí, y ningún módulo base
  depende de ellos.

**Regla explícita**: un módulo nunca importa el `Service` de otro módulo fuera de este grafo.
`tests/Feature/Arquitectura/DependenciasEntreModulosTest.php` lo verifica; su lista
`PENDIENTES` es deuda conocida y no recibe entradas nuevas. Si crees que necesitas otra
dependencia, pregunta antes de escribir código.

## 2. Casos de uso que cruzan módulos: Actions de aplicación (ARQ-03)

Cuando un caso de uso cruza módulos fuera del grafo, la orquestación vive en una Action de
`backend/app/Aplicacion/<Area>/` (un caso de uso por clase, método `ejecutar(...)`, dueña de
la transacción), nunca en el `Controller` ni en un `Service`. El controlador valida, llama la
Action y devuelve el Resource. Solo los controladores importan `App\Aplicacion`. Ejemplos:
`Ventas/RegistrarVenta`, `Devoluciones/RegistrarDevolucion`, `Caja/CerrarCaja`,
`Inicio/ObtenerResumenInicio`. Ya no hay excepciones numeradas en controladores.

## 3. Patrones obligatorios — no reinventar

- **Aislamiento de tenant**: todo modelo de negocio usa `BelongsToTenant` (columna `tenant_id`
  propia) o `BelongsToTenantViaRelacion` (`tenantRelacion()` vía `whereHas`). Nunca confíes
  solo en una Policy para aislar por tenant — las Policies de este repo no están conectadas a
  `authorize()` en ningún controller.
- **Auditoría**: agregar el FQCN del modelo a `config/auditoria.php` (array `auditables`).
  Nunca un trait en el modelo, nunca lógica de auditoría dentro del propio módulo.
- **Pago mixto**: toda entidad que cobra/paga usa una tabla `*_pagos` dedicada
  (`venta_pagos`, `apartado_abono_pagos`, `devolucion_pagos`). Nunca un campo de método de
  pago + valor mágico (`forma_pago = 'mixto'`) en la entidad padre.
- **`error_code`**: toda excepción de negocio extiende `ExcepcionNegocio` (Núcleo) y declara
  `errorCode()`, `status()` y `contexto()`; el manejador genérico de `bootstrap/app.php` arma
  la respuesta (API-04). Nunca agregues un mapeo por excepción en `bootstrap/app.php`. Tras
  crear o cambiar una, regenera `docs/estandares/catalogo_error_code.md` con
  `php artisan errores:catalogo`. Nunca esperes que el frontend parsee `message`.

## 4. Convención de frontend

- Toda entidad raíz (tabla de negocio con `tenant_id` propio) tiene vista dedicada de
  crear/editar/visualizar: rutas `/modulo`, `/modulo/nuevo`, `/modulo/:id`. El modal
  (`p-dialog`) es solo para sub-recursos genuinamente anidados sin lista/detalle propia
  (variantes de un producto, gastos de una sesión de caja, confirmaciones de un flujo).
- `RecordTabsComponent` (`nucleo-record-tabs`) es obligatorio en toda vista de registro
  (`*-detalle`), sin excepción.
- Para buscar/seleccionar una entidad de otro módulo, usa `EntidadSelectorComponent` vía el
  contrato `BuscadorEntidad`/`BuscadorDeHijos` + token de inyección. Nunca importes el
  servicio concreto de otro módulo (`ClienteService`, `ProductoService`, etc.) directamente
  desde un módulo que no lo posee.

## 5. Disciplina de pruebas

- Toda funcionalidad nueva (endpoint, componente, regla de negocio) necesita tests
  permanentes: PHPUnit (`backend/tests/Feature/...`) o Vitest (`*.component.spec.ts`,
  `nx test`). Un script de validación suelto (`tinker`, un `console.log` manual, un curl de
  prueba) no reemplaza el test — bórralo o conviértelo en test antes de cerrar el cambio.
- Si modificas un `Service` compartido por otros módulos (`VentaService`, `InventarioService`,
  `PrecioService`, `TenantContext`, etc.), vuelve a correr explícitamente la suite completa de
  cada módulo consumidor antes de dar el cambio por cerrado — no asumas que tu test local
  basta. Ejemplo: tocar `VentaService` obliga a re-correr Tpv, Apartados y Devoluciones (los
  tres lo consumen, ver §1).

## 6. Referencia completa

[docs/MANUAL_TECNICO.md](../docs/MANUAL_TECNICO.md) — mapa de dependencias con diagrama de
texto, catálogo completo de patrones (con el razonamiento detrás de cada uno), y el runbook
para clonar este repo en un producto nuevo.
