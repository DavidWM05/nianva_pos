# Núcleo — reglas de arquitectura

Instrucciones accionables para trabajar en este repo. Es un resumen, no la referencia
completa — el razonamiento detrás de cada regla vive en
[docs/MANUAL_TECNICO.md](../docs/MANUAL_TECNICO.md); léelo si necesitas el porqué, no lo
repitas aquí.

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
  `AuditObserver` vía config) sin que eso cuente como dependencia de negocio.

**Regla explícita**: un módulo nunca importa el `Service` de otro módulo fuera de esta lista.
Si crees que necesitas hacerlo, pregunta antes de escribir código.

## 2. Excepción a nivel `Controller`: orquestación permitida, en `Service` nunca

Los `Controllers` (capa Http) SÍ pueden importar un `Service`/`Model` de un módulo fuera de la
lista de arriba cuando necesitan un dato de presentación o un cálculo autoritativo que el
backend no puede confiar al cliente. El `Service` propio del módulo nunca debe conocer esa
dependencia. 3 instancias existentes, únicas permitidas hoy:

1. `CajaController::cerrar()` (Tpv) → `GastoService` (Gastos).
2. `ProductoVarianteController::store()` (Inventario) → `ConfiguracionTenant` (Configuración).
3. `InicioController::resumen()` (Núcleo) → `Venta` (Tpv) + `Apartado` (Apartados).

Una 4ª instancia es válida solo si: la orquestación queda en el `Controller` (nunca en el
`Service`), y el docblock del método la documenta citando las 3 anteriores.

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
- **`error_code`**: toda excepción de negocio nueva se mapea en `bootstrap/app.php` con un
  `error_code` estable en la respuesta 422. Nunca esperes que el frontend parsee `message`.

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
