# Backend — Núcleo

API Laravel 13 (PHP 8.3) del núcleo reutilizable. Monolito modular: cada dominio de negocio
vive en su propia carpeta bajo `app/Modules/<Modulo>` (migraciones, modelos, servicios,
controllers, providers propios), no hay una carpeta `app/Http`/`app/Models` compartida entre
módulos. Ver [`docs/nucleo_arquitectura.md`](../docs/nucleo_arquitectura.md) para el detalle
completo de arquitectura y el schema SQL base.

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan test
```

`--seed` corre `NucleoRolesPermisosSeeder` (roles `admin`/`vendedor` y su catálogo de
permisos `modulo.accion`), `MetodosPagoSeeder` (catálogo global de métodos de pago),
`UnidadesMedidaSeeder` (12 unidades por defecto), y `poblarModulosActivos()` (asigna la
lista de módulos habilitados a todos los tenants). Ninguno crea tenants ni usuarios — ver
la sección "Usuarios de prueba para desarrollo" para eso.

## Los 14 módulos

### Núcleo (10 originales)

| Módulo | Carpeta | Resuelve |
|---|---|---|
| Núcleo | `app/Modules/Nucleo` | tenants, sucursales, usuarios, roles/permisos, autenticación (login, 2FA, dispositivos confiables), métodos de pago, feature gating |
| Auditoría | `app/Modules/Auditoria` | historial de create/update/delete de los modelos listados en `config/auditoria.php`, errores del sistema |
| Inventario | `app/Modules/Inventario` | catálogo (productos/variantes), stock por sucursal, kardex, compras, proveedores |
| Precios y Promociones | `app/Modules/Precios` | reglas de descuento (%, monto fijo, nxm, bundle) y cupones |
| CRM | `app/Modules/Crm` | clientes, financiamiento propio del negocio, ventas a plazos |
| TPV / Ventas | `app/Modules/Tpv` | ventas, pagos mixtos, apertura/cierre de caja, reporte de ventas |
| Apartados | `app/Modules/Apartados` | layaway con abonos y pagos mixtos por abono |
| Devoluciones | `app/Modules/Devoluciones` | devoluciones y cambios, nota de crédito como reembolso |
| Gastos | `app/Modules/Gastos` | egresos de caja (vive dentro de la vista de caja de TPV) |
| Configuración | `app/Modules/Configuracion` | datos de la empresa (moneda, ticket, logo, módulos activos) |

### Extensión CRM (1)

| Módulo | Carpeta | Resuelve |
|---|---|---|
| CRM Avanzado | `app/Modules/CrmAvanzado` | interacciones con clientes, segmentación automática, loyalty/puntos, campañas por email |

### Nuevos (10)

| Módulo | Carpeta | Resuelve |
|---|---|---|
| Unidades de Medida | `app/Modules/UnidadesMedida` | catálogo de unidades (kg, und, l, m, etc.), tipo entero/fraccionario |
| Cotizaciones | `app/Modules/Cotizaciones` | presupuestos, cotizaciones, conversión a venta |
| Cuentas por Cobrar (CxC) | `app/Modules/CuentasCobrar` | cuentas por cobrar, abonos, saldos, aging report |
| Cuentas por Pagar (CxP) | `app/Modules/CuentasPagar` | cuentas por pagar, pagos, saldos, aging report |
| Delivery / Pedidos | `app/Modules/Delivery` | pedidos, máquina de estados, asignación de repartidor |
| Gift Cards | `app/Modules/GiftCards` | tarjetas de regalo, emisión, recargas, pago en POS |
| Notas de Crédito | `app/Modules/NotasCredito` | notas de crédito desde devoluciones, uso en ventas |
| Producción | `app/Modules/Produccion` | insumos, recetas, órdenes de producción, transformaciones |
| Payroll / Nómina | `app/Modules/Payroll` | empleados, generación de nóminas, cálculo de percepciones |
| Préstamos | `app/Modules/Prestamos` | préstamos recibidos, pagos, saldos |

## Feature Gating

El middleware `ModuloActivo` (`app/Modules/Nucleo/Http/Middleware/ModuloActivo.php`) controla
qué módulos están habilitados para cada tenant. Se usa como alias `modulo:slug` en las rutas:

```php
Route::middleware(['auth:sanctum', 'modulo:cotizaciones'])->group(function () { ... });
```

La lista de módulos activos vive en `configuracion_tenant.modulos_activos` (columna JSON).
Si no existe configuración para el tenant, se usan los 11 slugs por defecto:

```
cotizaciones, cxc, cxp, crm_avanzado, delivery, gift_cards,
notas_credito, produccion, ventas_plazos, payroll, prestamos
```

Cuando el módulo no está activo, responde `403` con `error_code: "modulo_no_activo"`.

Las rutas de cada módulo tienen dos niveles de protección:
1. **Feature gate:** `modulo:slug` — verifica que el tenant tenga el módulo habilitado
2. **Permiso:** `permiso:modulo.accion` — verifica que el usuario tenga el permiso específico

## Aislamiento de tenant

Shared database con `tenant_id` en cada tabla de negocio. El tenant activo de la request vive
en `TenantContext` — resuelto por el middleware `ResolveTenant` a partir del usuario autenticado.
Cada modelo Eloquent usa uno de tres patrones:

**1. `BelongsToTenant`** — el modelo tiene su propia columna `tenant_id`. Scope global que filtra
automáticamente cada consulta.

**2. `BelongsToTenantViaRelacion`** — el modelo NO tiene `tenant_id` propio; el aislamiento se
resuelve consultando una relación `belongsTo`. Ej: `ProductoVariante` → `producto`.

**3. Sin ninguno de los dos** — modelos del núcleo sin tenant_id (Tenant, Permiso, etc.).

Ambos traits exponen el bypass explícito `Modelo::sinTenant()` para cruzar la frontera.

## Auditoría desacoplada

Una sola tabla `auditoria` (create/update/delete con diff en JSON). El mecanismo vive en
`config/auditoria.php` — array `auditables` con el FQCN de cada modelo auditado.
Agregar auditoría a un modelo nuevo es una línea en ese archivo.

## Direcciones de dependencia entre módulos

```
Nucleo
  └── (base: tenant, usuarios, roles/permisos -- ningun modulo de negocio importa de aqui)

Inventario         Crm
     \             /
      \           /
       Precios   /            (Precios -> Inventario)
          \     /
           \   /
            Tpv                (Tpv -> Crm + Inventario + Precios)
           /    \
          /      \
   Apartados   Devoluciones    (Apartados -> Crm+Inventario+Precios+Tpv)
                               (Devoluciones -> Inventario+Tpv)
      Gastos                   (Gastos -> Tpv, solo Model/Exception)

   Cotizaciones                (Cotizaciones -> Precios + Tpv)
   Delivery                    (Delivery -> Tpv)
   CuentasCobrar               (CxC -> Tpv)
   CuentasPagar                (CxP -> Inventario)

   CrmAvanzado, GiftCards, NotasCredito, Produccion, Payroll, Prestamos,
   UnidadesMedida, VentasPlazos: sin dependencias de negocio hacia otros modulos nuevos.
```

Los módulos de extensión (Cotizaciones, Delivery, CxC, CxP, CrmAvanzado, GiftCards,
NotasCredito, Produccion, Payroll, Prestamos, UnidadesMedida) pueden depender de los módulos
base, nunca entre sí; ningún módulo base depende de ellos. Lo verifica
`tests/Feature/Arquitectura/DependenciasEntreModulosTest.php`.

## Casos de uso que cruzan módulos: Actions de aplicación

Cuando un caso de uso cruza módulos fuera del grafo, la orquestación vive en una Action de
`app/Aplicacion/<Area>/` (ARQ-03), dueña de la transacción; el controlador solo valida, la
llama y devuelve el Resource. Ni los controladores ni los `Services` orquestan entre módulos.

| Action | Llamada desde | Cruza |
|---|---|---|
| `Ventas/RegistrarVenta` | `VentaController::store()` | Tpv, Precios, GiftCards, NotasCredito |
| `Devoluciones/RegistrarDevolucion` | `DevolucionController::store()` | Devoluciones, NotasCredito |
| `Caja/CerrarCaja` | `CajaController::cerrar()` | Tpv, Gastos, CxC, GiftCards, CxP |
| `Inicio/ObtenerResumenInicio` | `InicioController::resumen()` | Núcleo, Tpv, Apartados |

## Catálogo de `error_code`

Toda excepción de negocio extiende `App\Modules\Nucleo\Exceptions\ExcepcionNegocio` y declara
`errorCode()`, `status()` (422 por defecto) y `contexto()`. Un solo manejador genérico en
`bootstrap/app.php` arma la respuesta `{ message, error_code, ...contexto }` (API-03, API-04).
El frontend distingue el error por `error_code`, nunca por `message`. La fuente vigente es
`docs/estandares/catalogo_error_code.md` (`php artisan errores:catalogo`); estas tablas son un
resumen por módulo.

### Feature Gating
| error_code | HTTP | Descripción |
|---|---|---|
| `modulo_no_activo` | 403 | El módulo no está habilitado para este tenant |

### TPV / Ventas
| error_code | HTTP | Descripción |
|---|---|---|
| `caja_no_abierta` | 422 | No hay sesión de caja abierta para la sucursal |
| `caja_ya_abierta` | 422 | Ya hay una sesión de caja abierta |
| `pago_no_cuadra` | 422 | La suma de pagos no coincide con el total |
| `cupon_invalido` | 422 | Cupón no válido (expirado, código incorrecto, etc.) |

### Inventario
| error_code | HTTP | Descripción |
|---|---|---|
| `stock_insuficiente` | 422 | No hay stock suficiente de una variante |

### Apartados
| error_code | HTTP | Descripción |
|---|---|---|
| `abono_pago_no_cuadra` | 422 | La suma de pagos de un abono no coincide |
| `apartado_estado_invalido` | 422 | Estado del apartado no permite la operación |
| `apartado_saldo_insuficiente` | 422 | Saldo abonado insuficiente para liquidar |

### Devoluciones
| error_code | HTTP | Descripción |
|---|---|---|
| `devolucion_pago_no_cuadra` | 422 | La suma de pagos no coincide con la diferencia |
| `devolucion_sobre_venta_sombra` | 422 | No se puede devolver una venta sombra |

### CxC — Cuentas por Cobrar
| error_code | HTTP | Descripción |
|---|---|---|
| `abono_excede_saldo` | 422 | Monto del abono > saldo pendiente |
| `cuenta_ya_pagada` | 422 | La cuenta ya está pagada |
| `cuenta_anulada` | 422 | La cuenta está anulada |
| `cuenta_con_abonos` | 422 | Tiene abonos registrados, no se puede anular |

### CxP — Cuentas por Pagar
| error_code | HTTP | Descripción |
|---|---|---|
| `pago_excede_saldo` | 422 | Monto del pago > saldo pendiente |
| `cuenta_pagar_ya_pagada` | 422 | La cuenta ya está pagada |
| `cuenta_pagar_anulada` | 422 | La cuenta está anulada |
| `cuenta_pagar_con_abonos` | 422 | Tiene pagos registrados, no se puede anular |

### Cotizaciones
| error_code | HTTP | Descripción |
|---|---|---|
| `cotizacion_no_editable` | 422 | Estado no permite edición |
| `cotizacion_vencida` | 422 | Fecha de vencimiento pasada |
| `cotizacion_ya_convertida` | 422 | Ya fue convertida a venta |
| `sin_cliente` | 422 | Cotización sin cliente no se puede convertir |

### Delivery / Pedidos
| error_code | HTTP | Descripción |
|---|---|---|
| `transicion_estado_invalida` | 422 | Salto de estado no permitido |
| `pedido_no_asignable` | 422 | No se puede asignar repartidor (entregado/cancelado) |

### Gift Cards
| error_code | HTTP | Descripción |
|---|---|---|
| `monto_invalido` | 422 | Monto ≤ 0 |
| `gift_card_expirada` | 422 | Fecha de expiración pasada |
| `gift_card_cancelada` | 422 | Gift card cancelada |
| `gift_card_saldo_insuficiente` | 422 | Saldo insuficiente para el descuento |
| `gift_card_ya_cancelada` | 422 | Ya está cancelada |
| `gift_card_sin_saldo` | 422 | No tiene saldo disponible |

### Notas de Crédito
| error_code | HTTP | Descripción |
|---|---|---|
| `nota_credito_expirada` | 422 | Fecha de expiración pasada |
| `nota_credito_sin_saldo` | 422 | Saldo disponible insuficiente |
| `nota_credito_saldo_insuficiente` | 422 | Monto excede el saldo disponible |

### CRM Avanzado
| error_code | HTTP | Descripción |
|---|---|---|
| `ajuste_puntos_invalido` | 422 | El ajuste de puntos no puede ser cero |
| `puntos_insuficientes` | 422 | El cliente no tiene suficientes puntos |
| `puntos_no_generados` | 422 | El total de la venta no genera puntos |

### Unidades de Medida
| error_code | HTTP | Descripción |
|---|---|---|
| `unidad_en_uso` | 422 | No se puede eliminar si está referenciada |

### Producción
| error_code | HTTP | Descripción |
|---|---|---|
| `stock_insumos_insuficiente` | 422 | No hay materia prima suficiente |
| `orden_produccion_no_completable` | 422 | Estado no permite completar la orden |

### Payroll
| error_code | HTTP | Descripción |
|---|---|---|
| `nomina_ya_pagada` | 422 | La nómina ya fue pagada |
| `empleado_ya_existe` | 422 | El usuario ya está registrado como empleado |
| `sin_empleados` | 422 | No hay empleados activos en la sucursal |

### Préstamos
| error_code | HTTP | Descripción |
|---|---|---|
| `prestamo_ya_pagado` | 422 | El préstamo ya está pagado |
| `pago_excede_saldo_prestamo` | 422 | Monto del pago > saldo pendiente |

## Seeders

| Seeder | Archivo | ¿Corre con `--seed`? | Descripción |
|---|---|---|---|
| `NucleoRolesPermisosSeeder` | `app/Modules/Nucleo/Database/Seeders/` | ✅ Sí | Roles admin/vendedor + catálogo de ~60 permisos `modulo.accion` |
| `MetodosPagoSeeder` | `app/Modules/Nucleo/Database/Seeders/` | ✅ Sí | Efectivo, Tarjeta, Transferencia, Gift Card, Nota de Crédito, Yape/Plin, Cheque |
| `UnidadesMedidaSeeder` | `app/Modules/UnidadesMedida/Database/Seeders/` | ✅ Sí | 12 unidades globales (und, kg, l, m, bal, bol, cja, rol, par, pli, var, tbo) |
| `poblarModulosActivos()` | `database/seeders/DatabaseSeeder.php` | ✅ Sí | Asigna los 11 slugs de módulos activos a todos los tenants |
| `DesarrolloSeeder` | `app/Modules/Nucleo/Database/Seeders/` | ❌ Manual | Crea tenant demo + admin/vendedor con 2FA preconfigurado |

## Permisos sembrados por módulo

| Módulo | Permisos |
|---|---|
| `tenants` | ver, crear, editar, eliminar |
| `sucursales` | ver, crear, editar, eliminar |
| `usuarios` | ver, crear, editar, eliminar |
| `roles` | ver, crear, editar, eliminar |
| `permisos` | ver, crear, editar, eliminar |
| `metodos_pago` | ver, crear, editar, eliminar |
| `inventario` | ver, crear, editar, eliminar |
| `compras` | ver, crear |
| `clientes` | ver, crear, editar, eliminar |
| `ventas` | ver, crear, anular |
| `caja` | ver, abrir, cerrar |
| `apartados` | ver, crear, abonar, cancelar |
| `devoluciones` | ver, crear |
| `gastos` | ver, crear |
| `reglas_precio` | ver, crear, editar, eliminar |
| `cupones` | ver, crear, editar, eliminar |
| `configuracion` | ver, editar |
| `reportes` | ver |
| `auditoria` | ver |
| `cotizaciones` | ver, crear, editar, eliminar, convertir |
| `cuentas_cobrar` | ver, crear, registrar_abono, anular |
| `cuentas_pagar` | ver, registrar_pago |
| `pedidos` | ver, crear, cambiar_estado, asignar_repartidor |
| `gift_cards` | ver, emitir, recargar, cancelar |
| `notas_credito` | ver |
| `crm_interacciones` | ver, crear |
| `crm_campanas` | enviar |
| `loyalty` | ver, ajustar |
| `produccion` | ver, crear, completar, transformar |
| `payroll` | ver, crear, pagar |
| `prestamos` | ver, crear, pagar |
| `ventas_plazos` | ver, crear |
| `reportes_cuentas_cobrar` | ver |
| `reportes_cuentas_pagar` | ver |
| `reportes_crm` | ver |

## API Reference — Nuevos endpoints

### Cotizaciones (`modulo:cotizaciones`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/cotizaciones` | `cotizaciones.ver` | Lista paginada con filtros por estado, cliente, fechas y búsqueda por número |
| POST | `/api/cotizaciones` | `cotizaciones.crear` | Crear cotización con items |
| GET | `/api/cotizaciones/{cotizacion}` | `cotizaciones.ver` | Detalle completo + items |
| PUT | `/api/cotizaciones/{id}` | `cotizaciones.editar` | Editar cotización (solo pendiente) |
| DELETE | `/api/cotizaciones/{id}` | `cotizaciones.eliminar` | Anular cotización (marca estado, no borra) |
| POST | `/api/cotizaciones/{id}/convertir` | `cotizaciones.convertir` | Convertir en venta (descuenta stock) |

### CxC — Cuentas por Cobrar (`modulo:cxc`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/cuentas-cobrar` | `cuentas_cobrar.ver` | Lista paginada con filtros |
| GET | `/api/cuentas-cobrar/reporte` | `reportes_cuentas_cobrar.ver` | Aging report: totales, antigüedad, top clientes |
| GET | `/api/cuentas-cobrar/{cuentaCobrar}` | `cuentas_cobrar.ver` | Detalle + abonos |
| POST | `/api/cuentas-cobrar/{id}/abonos` | `cuentas_cobrar.registrar_abono` | Registrar abono (actualiza saldo) |
| POST | `/api/cuentas-cobrar/{id}/anular` | `cuentas_cobrar.anular` | Anular (solo sin abonos) |

### CxP — Cuentas por Pagar (`modulo:cxp`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/cuentas-pagar` | `cuentas_pagar.ver` | Lista paginada con filtros |
| GET | `/api/cuentas-pagar/reporte` | `reportes_cuentas_pagar.ver` | Aging report: totales, antigüedad, top proveedores |
| GET | `/api/cuentas-pagar/{cuentaPagar}` | `cuentas_pagar.ver` | Detalle + pagos |
| POST | `/api/cuentas-pagar/{id}/pagos` | `cuentas_pagar.registrar_pago` | Registrar pago (actualiza saldo) |
| POST | `/api/cuentas-pagar/{id}/anular` | `cuentas_pagar.ver` | Anular (solo sin pagos) |

### CRM Avanzado (`modulo:crm_avanzado`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/clientes/{cliente}/interacciones` | `crm_interacciones.ver` | Historial de interacciones del cliente |
| POST | `/api/clientes/{cliente}/interacciones` | `crm_interacciones.crear` | Crear interacción (llamada, email, whatsapp, etc.) |
| GET | `/api/clientes/{cliente}/loyalty` | `loyalty.ver` | Puntos y transacciones de fidelidad |
| POST | `/api/clientes/{cliente}/loyalty/ajustar` | `loyalty.ajustar` | Ajuste manual de puntos |
| POST | `/api/crm/campanas/enviar` | `crm_campanas.enviar` | Enviar campaña por email a un segmento |
| GET | `/api/crm/reporte` | `reportes_crm.ver` | Reporte CRM: segmentos, interacciones, loyalty, campañas |

### Delivery / Pedidos (`modulo:delivery`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/pedidos` | `pedidos.ver` | Lista paginada con filtros |
| POST | `/api/pedidos` | `pedidos.crear` | Crear pedido con items |
| GET | `/api/pedidos/{pedido}` | `pedidos.ver` | Detalle completo |
| PATCH | `/api/pedidos/{id}/estado` | `pedidos.cambiar_estado` | Máquina de estados (pendiente→preparando→en_camino→entregado) |
| PATCH | `/api/pedidos/{id}/repartidor` | `pedidos.asignar_repartidor` | Asignar/remplazar repartidor |

### Gift Cards (`modulo:gift_cards`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/gift-cards` | `gift_cards.ver` | Lista paginada |
| POST | `/api/gift-cards` | `gift_cards.emitir` | Emitir nueva gift card con código único |
| GET | `/api/gift-cards/{giftCard}` | `gift_cards.ver` | Detalle + recargas |
| POST | `/api/gift-cards/{id}/recargar` | `gift_cards.recargar` | Recargar saldo |
| POST | `/api/gift-cards/{id}/cancelar` | `gift_cards.cancelar` | Cancelar gift card |

### Notas de Crédito (`modulo:notas_credito`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/notas-credito` | `notas_credito.ver` | Lista paginada |
| GET | `/api/notas-credito/{notaCredito}` | `notas_credito.ver` | Detalle + usos |
| GET | `/api/clientes/{cliente}/notas-credito` | `notas_credito.ver` | Notas activas de un cliente |

### Ventas a Plazos (`modulo:ventas_plazos`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/planes-pago-cliente` | `ventas_plazos.ver` | Lista paginada de planes |
| GET | `/api/planes-pago-cliente/{plan}` | `ventas_plazos.ver` | Detalle del plan + cuotas |
| POST | `/api/ventas/{venta}/plan-pago` | `ventas_plazos.crear` | Crear plan con N cuotas e interés |
| POST | `/api/planes-pago-cliente/{plan}/pagar-cuota` | `ventas_plazos.crear` | Pagar una cuota específica |

### Unidades de Medida (sin feature gate)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/unidades-medida` | — | Lista de unidades activas |
| POST | `/api/unidades-medida` | — | Crear unidad |
| PUT | `/api/unidades-medida/{id}` | — | Editar unidad |
| DELETE | `/api/unidades-medida/{id}` | — | Eliminar (solo si no está en uso) |

### Producción (`modulo:produccion`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/insumos` | `produccion.ver` | Lista paginada de insumos |
| POST | `/api/insumos` | `produccion.crear` | Crear insumo |
| GET | `/api/insumos/{insumo}/stocks` | `produccion.ver` | Stock del insumo por sucursal + lote |
| POST | `/api/insumos/{insumo}/stocks` | `produccion.crear` | Agregar/recibir stock (upsert por lote) |
| GET | `/api/recetas` | `produccion.ver` | Lista paginada de recetas |
| POST | `/api/recetas` | `produccion.crear` | Crear receta con ingredientes |
| GET | `/api/ordenes-produccion` | `produccion.ver` | Lista paginada de órdenes |
| POST | `/api/ordenes-produccion` | `produccion.crear` | Crear orden de producción |
| PATCH | `/api/ordenes-produccion/{id}/estado` | `produccion.crear` | Cambiar estado/completar (descuenta insumos, incrementa producto) |
| GET | `/api/transformaciones` | `produccion.ver` | Lista paginada de transformaciones |
| POST | `/api/transformaciones` | `produccion.transformar` | Registrar transformación entre variantes |

### Payroll / Nómina (`modulo:payroll`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/empleados` | `payroll.ver` | Lista paginada de empleados |
| GET | `/api/empleados/{empleado}` | `payroll.ver` | Detalle del empleado |
| POST | `/api/empleados` | `payroll.crear` | Registrar empleado vinculado a un usuario |
| GET | `/api/nominas` | `payroll.ver` | Lista paginada de nóminas |
| GET | `/api/nominas/{nomina}` | `payroll.ver` | Detalle de nómina + detalles |
| POST | `/api/nominas/generar` | `payroll.crear` | Generar nómina para un período y sucursal |
| PATCH | `/api/nominas/{id}/pagar` | `payroll.pagar` | Marcar nómina como pagada |

### Préstamos (`modulo:prestamos`)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/prestamos` | `prestamos.ver` | Lista paginada |
| GET | `/api/prestamos/{prestamo}` | `prestamos.ver` | Detalle + pagos |
| POST | `/api/prestamos` | `prestamos.crear` | Registrar préstamo recibido |
| POST | `/api/prestamos/{id}/pagos` | `prestamos.pagar` | Registrar pago (actualiza saldo) |

### Reportes (en módulos existentes)

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/ventas/reporte` | `reportes.ver` | Reporte de ventas: totales, sucursales, métodos de pago, top productos |
| GET | `/api/cuentas-cobrar/reporte` | `reportes_cuentas_cobrar.ver` | Aging report CxC: antigüedad, top clientes |
| GET | `/api/cuentas-pagar/reporte` | `reportes_cuentas_pagar.ver` | Aging report CxP: antigüedad, top proveedores |
| GET | `/api/crm/reporte` | `reportes_crm.ver` | Reporte CRM: segmentos, interacciones, loyalty, campañas |

## Usuarios de prueba para desarrollo

`DesarrolloSeeder` crea un tenant de desarrollo, una sucursal, y dos usuarios (`admin`/`vendedor`).
No corre con `--seed` — se ejecuta a mano:

```bash
php artisan db:seed --class="App\Modules\Nucleo\Database\Seeders\DesarrolloSeeder"
```

| Usuario | Correo | Contraseña | 2FA |
|---|---|---|---|
| Admin | `admin@nucleo.test` | `password-dev-123` | ✅ Preconfigurado (secreto TOTP se imprime en consola) |
| Vendedor | `vendedor@nucleo.test` | `password-dev-123` | ❌ No requiere |

> [!WARNING]
> **`DesarrolloSeeder` nunca debe correr en un entorno de producción.**

## Pruebas

```bash
# Suite completa (289 tests)
php artisan test

# Por módulo
php artisan test --filter="Cotizacion"
php artisan test --filter="GiftCard"
php artisan test --filter="CuentasCobrar"
php artisan test --filter="Delivery"
php artisan test --filter="CrmAvanzado"

# Tests de integración (permisos)
php artisan test --filter="PermisoGateTest"
```

## Arquitectura completa

Ver **[docs/nucleo_arquitectura.md](../docs/nucleo_arquitectura.md)** para el mapa completo de
módulos, las decisiones de diseño y el schema SQL base.

Ver **[docs/MANUAL_TECNICO.md](../docs/MANUAL_TECNICO.md)** para el mapa de dependencias,
el catálogo de patrones establecidos y el runbook para arrancar un producto nuevo.

Ver **[docs/01_ARQUITECTURA_BASE.md](../docs/01_ARQUITECTURA_BASE.md)** para la especificación
completa de tablas nuevas, migraciones y feature gating.

Ver **[docs/02_CONTRATO_API.md](../docs/02_CONTRATO_API.md)** para el contrato de API detallado
de todos los módulos nuevos.

Ver **[docs/03_ESPECIFICACION_BACKEND.md](../docs/03_ESPECIFICACION_BACKEND.md)** para las reglas
de dominio, validaciones y servicios.
