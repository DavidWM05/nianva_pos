# 03 — Especificación Backend: Validaciones y Reglas de Dominio

> **Basado en:** Patrón de Services de Núcleo (un Service por módulo como único gatekeeper de sus tablas),
> regla de orquestación (Controllers sí, Services nunca), y formato `error_code` estable.
> **No se redefine:** cómo se estructura un módulo en `app/Modules/<Nombre>/`.

---

## 0. Estructura de módulos nuevos

Cada módulo nuevo sigue la misma estructura de directorios que los 10 módulos de Núcleo:

```
app/Modules/
├── CuentasCobrar/
│   ├── Database/
│   │   └── Migrations/
│   ├── Http/
│   │   ├── Controllers/
│   │   └── Middleware/
│   ├── Models/
│   ├── Services/
│   └── Exceptions/
├── CuentasPagar/
├── Cotizaciones/
├── CrmAvanzado/           (extiende modulo CRM existente pero con Service propio)
├── Delivery/
├── GiftCards/
└── NotasCredito/
```

**Regla:** Cada módulo tiene **un Service principal** que es el único que escribe en sus tablas. Los Controllers llaman al Service; ningún otro Service importa un Service de estos módulos.

---

## 1. Feature Gating — Middleware `ModuloActivo`

### Clase: `app/Modules/Nucleo/Http/Middleware/ModuloActivo.php`

```php
class ModuloActivo
{
    public function handle(Request $request, Closure $next, string $moduloSlug): Response
    {
        $tenant = app(TenantContext::class)->getTenant();
        
        if (!$tenant) {
            return $next($request); // superadmin bypass
        }

        $activos = $tenant->configuracion->modulos_activos ?? [];
        
        if (!in_array($moduloSlug, $activos)) {
            throw new ModuloNoActivoException($moduloSlug);
        }

        return $next($request);
    }
}
```

**Registro en `bootstrap/app.php`:**
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias('modulo', \App\Modules\Nucleo\Http\Middleware\ModuloActivo::class);
})
```

**Excepción:**
```php
class ModuloNoActivoException extends \RuntimeException
{
    protected $moduloSlug;
    
    public function __construct(string $moduloSlug)
    {
        parent::__construct("El módulo '{$moduloSlug}' no está activo para este tenant");
        $this->moduloSlug = $moduloSlug;
    }
    
    public function getModuloSlug(): string
    {
        return $this->moduloSlug;
    }
}
```

**En `bootstrap/app.php` dentro de `withExceptions()`:**
```php
->withExceptions(function (Exceptions $exceptions) {
    $exceptions->render(function (ModuloNoActivoException $e) {
        return response()->json([
            'message' => $e->getMessage(),
            'error_code' => 'modulo_no_activo',
        ], 403);
    });
})
```

---

## 2. Módulo CxC — Cuentas por Cobrar

### Service: `CuentasCobrarService`

**Archivo:** `app/Modules/CuentasCobrar/Services/CuentasCobrarService.php`

**Métodos públicos:**

| Método | Descripción | ¿Invoca a otro Service de Núcleo? |
|--------|-------------|----------------------------------|
| `crearDesdeVenta(Venta $venta, int $diasCredito = 30): CuentaCobrar` | Crea CxC automáticamente al marcar venta como crédito | **Sí:** `VentaService::marcarComoCredito()` — pero ojo, la regla de orquestación dice que un Service nunca invoca a otro Service de módulo posterior. Solución: esta lógica se orquesta desde el **Controller** de ventas (ver §2.1) |
| `registrarAbono(int $cuentaId, array $data): AbonoCuenta` | Registra abono, actualiza saldo, cambia estado si corresponde | — |
| `anular(int $cuentaId): void` | Anula la cuenta (solo si no tiene abonos) | — |
| `obtenerResumenPorCliente(int $clienteId): array` | Saldo total pendiente por cliente | — |
| `obtenerVencidas(): Collection` | Cuentas con fecha_vencimiento < today | — |

### Reglas de dominio (en `CuentasCobrarService`):

| # | Regla | Implementación |
|---|-------|---------------|
| 1 | No se puede superar el saldo pendiente | `AbonoCuenta.monto <= CuentaCobrar.saldo_pendiente` |
| 2 | Al registrar abono, actualizar saldo | `saldo_pendiente -= monto`; si llega a 0, `estado = 'pagada'` |
| 3 | Al crear desde venta, validar que sea crédito | Verificar `venta.tipo_pago` (nueva columna o forma de pago específica) |
| 4 | No anular si hay abonos | Lanzar `CuentaConAbonosException` |
| 5 | No registrar abono en cuenta pagada o anulada | Lanzar `CuentaEstadoInvalidoException` |
| 6 | Registrar en kardex de caja | El abono incrementa el efectivo en caja (usa `CajaService::registrarIngreso()`) |

### 2.1 Orquestación: ¿cuándo se crea una CxC?

**Regla:** El `VentasController` (módulo TPV) orquesta la creación de CxC cuando el tipo de pago es crédito. **Nunca** desde `CuentasCobrarService` ni desde `VentaService`.

```php
// En VentasController::store() — flujo extendido
public function store(VentaRequest $request)
{
    $venta = DB::transaction(function () use ($request) {
        $venta = VentaService::crear($request->validated());
        
        if ($request->tipo_pago === 'credito') {
            $cuenta = app(CuentasCobrarService::class)
                ->crearDesdeVenta($venta, $request->dias_credito ?? 30);
        }
        
        return $venta;
    });
    
    return response()->json(['data' => $venta], 201);
}
```

Esto sigue exactamente el patrón documentado en MANUAL_TECNICO §1 — Controllers orquestan, Services nunca. El docblock del método debe citar las 3 instancias anteriores (CajaController, ProductoVarianteController, InicioController) y agregar esta como la #4.

### Excepciones nuevas del módulo CxC

```php
class AbonoExcedeSaldoException extends \RuntimeException {}
class CuentaYaPagadaException extends \RuntimeException {}
class CuentaAnuladaException extends \RuntimeException {}
class CuentaConAbonosException extends \RuntimeException {}
```

Registrar en `bootstrap/app.php`:
```php
$exceptions->render(function (AbonoExcedeSaldoException $e) {
    return response()->json(['message' => $e->getMessage(), 'error_code' => 'abono_excede_saldo'], 422);
});
// ... mismo patrón para las otras 3
```

---

## 3. Módulo CxP — Cuentas por Pagar

### Service: `CuentasPagarService`

**Archivo:** `app/Modules/CuentasPagar/Services/CuentasPagarService.php`

**Métodos públicos:**

| Método | Descripción |
|--------|-------------|
| `crearDesdeCompra(Compra $compra, int $diasCredito = 30): CuentaPagar` | Crea CxP automáticamente al marcar compra como crédito |
| `registrarPago(int $cuentaId, array $data): AbonoPagar` | Registra pago, actualiza saldo |
| `anular(int $cuentaId): void` | Anula la cuenta |

**Reglas de dominio:** Mismas que CxC pero del lado de compras.

### 3.1 Orquestación

La CxP se crea desde `ComprasController::store()` (módulo Inventario), mismo patrón que CxC. Es la instancia #5 de orquestación documentada.

---

## 4. Módulo Cotizaciones

### Service: `CotizacionService`

**Archivo:** `app/Modules/Cotizaciones/Services/CotizacionService.php`

**Métodos públicos:**

| Método | Descripción |
|--------|-------------|
| `crear(array $data): Cotizacion` | Crea cotización + items |
| `actualizar(int $id, array $data): Cotizacion` | Edita (solo si pendiente) |
| `anular(int $id): void` | Marca como anulada |
| `convertirAVenta(int $id, array $dataVenta): Venta` | Convierte cotización en venta |

### Reglas de dominio:

| # | Regla |
|---|-------|
| 1 | **No modifica stock** — a diferencia de ventas, cotizar no descuenta inventario |
| 2 | `numero_cotizacion` único por tenant — formato `COT-{correlativo}` |
| 3 | `fecha_vencimiento = created_at + validez_dias` |
| 4 | Solo se puede editar/eliminar si `estado = 'pendiente'` |
| 5 | Al convertir: crear venta con `PrecioService::calcularDescuento()` para aplicar promociones vigentes |
| 6 | Al convertir: si `stock_insuficiente`, lanzar la excepción existente de Núcleo |
| 7 | Al convertir: si cotización no tiene cliente (`cliente_id = null`), lanzar `SinClienteException` |

### Service de Núcleo que consume `CotizacionService`:

```
CotizacionService::convertirAVenta()
  → usa PrecioService::calcularDescuento()  ← Service existente de Núcleo (módulo Precios)
  → usa VentaService::crear()                ← Service existente de Núcleo (módulo TPV)
```

> **IMPORTANTE:** `CotizacionService` puede invocar `VentaService` y `PrecioService` porque en el grafo de dependencias de Núcleo (MANUAL_TECNICO §1), Cotizaciones dependería de Precios + TPV. Esto es válido porque Cotizaciones es un módulo "posterior" en el grafo (como Apartados y Devoluciones dependen de TPV). Nunca al revés.

### Excepciones nuevas:

```php
class CotizacionNoEditableException extends \RuntimeException {}
class CotizacionVencidaException extends \RuntimeException {}
class CotizacionYaConvertidaException extends \RuntimeException {}
class SinClienteException extends \RuntimeException {}
```

---

## 5. Módulo CRM Avanzado (Extensión)

### Service: `CrmAvanzadoService`

**Archivo:** `app/Modules/CrmAvanzado/Services/CrmAvanzadoService.php`

**Métodos públicos:**

| Método | Descripción |
|--------|-------------|
| `registrarInteraccion(int $clienteId, array $data): CrmInteraccion` | |
| `obtenerInteracciones(int $clienteId, array $filtros): Collection` | |
| `calcularSegmento(int $clienteId): string` | Recalcula segmento basado en historial |
| `recalcularSegmentos(): int` | Recalcula segmento de todos los clientes (comando programado) |
| `enviarCampana(array $data): array` | Envía campaña por email a segmento |

### Service de Núcleo que consume:

```
CrmAvanzadoService::enviarCampana()
  → usa Mail facade de Laravel (configuración SMTP desde configuracion_tenant)
```

### Reglas de segmentación automática:

```php
public function calcularSegmento(int $clienteId): string
{
    $ventas = Venta::where('cliente_id', $clienteId)->count();
    $ultimaVenta = Venta::where('cliente_id', $clienteId)
        ->where('estado', 'completada')
        ->latest('fecha')
        ->first();
    
    if ($ventas === 0) return 'nuevo';
    if ($ultimaVenta && $ultimaVenta->fecha < now()->subMonth()) return 'inactivo';
    if ($ventas >= 5) return 'vip';
    return 'frecuente';
}
```

### Reglas de puntos de fidelidad:

| # | Regla |
|---|-------|
| 1 | 1 punto por cada S/10 de total de venta (tasa configurable en `configuracion_tenant`) |
| 2 | Los puntos se ganan al crear una venta completada |
| 3 | Los puntos se descuentan al canjearlos como forma de pago |
| 4 | Los puntos expiran a los 365 días (configurable) |
| 5 | `puntos_loyalty` nunca puede ser negativo |

---

## 6. Módulo Delivery / Pedidos

### Service: `PedidoService`

**Archivo:** `app/Modules/Delivery/Services/PedidoService.php`

**Métodos públicos:**

| Método | Descripción |
|--------|-------------|
| `crear(array $data): Pedido` | |
| `cambiarEstado(int $id, string $nuevoEstado): Pedido` | |
| `asignarRepartidor(int $id, int $repartidorId): Pedido` | |
| `generarVenta(int $id, array $dataVenta): Venta` | Crea la venta vinculada al pedido |

### Máquina de estados (validación de transiciones):

```php
private $transicionesPermitidas = [
    'pendiente'  => ['preparando', 'cancelado'],
    'preparando' => ['en_camino', 'cancelado'],
    'en_camino'  => ['entregado', 'cancelado'],
    'entregado'  => [],
    'cancelado'  => [],
];
```

### Reglas de dominio:

| # | Regla |
|---|-------|
| 1 | No se puede asignar repartidor si el pedido está `entregado` o `cancelado` |
| 2 | Al cambiar a `entregado`, si no hay `venta_id`, se genera una venta automática (con los items de `pedido_items`) |
| 3 | `repartidor_id` debe ser un usuario con el rol `repartidor` (verificar con `Usuario::tienePermiso()` o un helper ad-hoc) |
| 4 | El delivery puede tener costo fijo (default de `configuracion_tenant`) o variable por pedido |

### Service de Núcleo que consume:

```
PedidoService::generarVenta()
  → usa VentaService::crear()   ← Service existente de Núcleo
```

---

## 7. Módulo Gift Cards

### Service: `GiftCardService`

**Archivo:** `app/Modules/GiftCards/Services/GiftCardService.php`

**Métodos públicos:**

| Método | Descripción |
|--------|-------------|
| `emitir(array $data): GiftCard` | Crea gift card con código único |
| `recargar(int $id, float $monto, int $usuarioId): GiftCard` | |
| `cancelar(int $id): void` | Marca como cancelada |
| `descontarSaldo(int $id, float $monto): void` | Usado al pagar con gift card |
| `validarParaPago(string $codigo): GiftCard` | Valida que exista, esté activa, no expirada y tenga saldo |

### Reglas de dominio:

| # | Regla |
|---|-------|
| 1 | `codigo` único: `GC-{tenant_id}-{random_8_chars}` |
| 2 | No se puede recargar si está expirada o cancelada |
| 3 | `saldo_actual` nunca puede ser negativo |
| 4 | Al descontar saldo, si llega a 0, `estado = 'usada'` |
| 5 | Si la gift card está asociada a un cliente, solo ese cliente puede usarla (o configurable: cualquiera que la presente) |

### Integración con pagos mixtos:

El uso de gift card como pago se maneja desde `VentaService` (módulo TPV). El `VentasController`:
1. Recibe `gift_card_codigo` como método de pago
2. Llama a `GiftCardService::validarParaPago($codigo)`
3. Llama a `GiftCardService::descontarSaldo($id, $monto)`
4. Crea registro en `venta_pagos` con el `metodo_pago_id` de Gift Card

Esto NO viola la regla de orquestación porque la orquestación vive en el Controller.

---

## 8. Nota de Crédito (Extensión de Devoluciones)

### Service: `NotaCreditoService`

**Archivo:** `app/Modules/NotasCredito/Services/NotaCreditoService.php`

**Métodos públicos:**

| Método | Descripción |
|--------|-------------|
| `crearDesdeDevolucion(Devolucion $devolucion): NotaCredito` | Crea NC vinculada a devolución |
| `usarEnVenta(int $notaCreditoId, int $ventaId, float $monto): void` | Descuenta saldo |
| `obtenerActivasPorCliente(int $clienteId): Collection` | |
| `validarParaPago(int $notaCreditoId): NotaCredito` | Valida estado y saldo |

### ¿Dónde se orquesta la creación?

**En el Controller de Devoluciones** (módulo Devoluciones), cuando se registra una devolución con `tipo_reembolso = 'nota_credito'`:

```php
// En DevolucionesController::store()
public function store(DevolucionRequest $request)
{
    $data = DB::transaction(function () use ($request) {
        $devolucion = DevolucionService::crear($request->validated());
        
        if ($request->tipo_reembolso === 'nota_credito') {
            $nota = app(NotaCreditoService::class)
                ->crearDesdeDevolucion($devolucion);
        }
        
        return compact('devolucion', 'nota');
    });
}
```

### Uso como método de pago (en VentasController):

Mismo patrón que Gift Card: se valida, se descuenta saldo, se registra en `venta_pagos`.

---

## 9. Integración con el Corte de Caja

### Actualización del flujo de cierre

El `CajaService::cerrar()` existente en Núcleo debe actualizarse para incluir:

```
Total teorico = monto_apertura
              + ventas_sesion (incluye ventas a credito como ingreso futuro pendiente)
              + abonos_cuenta_recibidos (ingresos de CxC cobradas)
              + recargas_gift_card
              - pagos_cxp_realizados (egresos de CxP pagadas)
              - gastos
```

**Decisión:** No tocar `CajaService::cerrar()` — en vez de eso, **el Controller `CajaController::cerrar()`** orquesta la consulta de todos estos valores (CxC, CxP, Gift Cards) y calcula el total teórico final. Esto sigue la regla de orquestación.

---

## 10. Módulo: Unidades de Medida

### Service: `UnidadMedidaService`

**Archivo:** `app/Modules/UnidadesMedida/Services/UnidadMedidaService.php`

**Métodos públicos:**
- `listarActivas(int $tenantId): Collection`
- `crear(array $data): UnidadMedida`
- `actualizar(int $id, array $data): UnidadMedida`
- `eliminar(int $id): void`

**Reglas:**
- `abreviatura` única por tenant
- `tipo = 'fraccionario'` permite decimales; `tipo = 'entero'` forza enteros en cantidad
- No se puede eliminar si hay `producto_variantes` referenciándola (lanza `UnidadEnUsoException`)

---

## 11. Módulo: Producción / Recetas

### Service: `ProduccionService`

**Archivo:** `app/Modules/Produccion/Services/ProduccionService.php`

**Métodos públicos:**

| Método | Descripción | Service de Núcleo que consume |
|--------|-------------|------------------------------|
| `crearReceta(array $data): Receta` | Crea receta + ingredientes, calcula costo total | — |
| `actualizarReceta(int $id, array $data): Receta` | Reemplaza ingredientes, recalcula costo | — |
| `calcularCostoUnitario(Receta $receta): float` | `sum(ingrediente.cantidad * insumo.costo) / receta.rendimiento` | — |
| `crearOrdenProduccion(array $data): OrdenProduccion` | Valida stock de insumos vs. cantidad programada | — |
| `completarOrden(int $id, int $cantidad): void` | Deduce insumos (FIFO), incrementa stock producto | `InventarioService::ajustarStock()` |
| `cancelarOrden(int $id): void` | Cambia estado | — |
| `registrarTransformacion(array $data): Transformacion` | Convierte variante origen → destino | `InventarioService::ajustarStock()` |

### Service de Núcleo que consume:

```
ProduccionService::completarOrden()
  → usa InventarioService::ajustarStock()   ← para incrementar producto terminado
```

### Excepciones nuevas:

```php
class StockInsumosInsuficienteException extends \RuntimeException {}
```

### Reglas de dominio:

| # | Regla |
|---|-------|
| 1 | No crear orden si `cantidad_programada > maximo_producible` (min de `floor(stock_insumo / cantidad_ingrediente)` por cada ingrediente) |
| 2 | Al completar: deducir insumos con FIFO por fecha de vencimiento (FEFO) |
| 3 | Al completar: incrementar `inventario_stock` de la variante destino por `cantidad_producida * receta.rendimiento` |
| 4 | Transformación: validar stock suficiente en origen; reusa `stock_insuficiente` de Núcleo |

---

## 12. Módulo: Ventas a Plazos / Installment

### Service: `VentasPlazosService` (extiende módulo CRM)

**Archivo:** `app/Modules/Crm/Services/VentasPlazosService.php`

**Métodos públicos:**

| Método | Descripción |
|--------|-------------|
| `crearPlan(int $ventaId, array $data): PlanesPagoCliente` | Crea plan con N cuotas e interés |
| `pagarCuota(int $planId, int $cuotaId, array $dataPago): void` | Marca cuota como pagada |

**Reglas de dominio:**

| # | Regla |
|---|-------|
| 1 | `interes_total = total_venta * (tasa_interes / 100)` |
| 2 | `monto_capital_por_cuota = total_venta / numero_cuotas` |
| 3 | `monto_interes_por_cuota = interes_total / numero_cuotas` |
| 4 | `monto_por_cuota = monto_capital_por_cuota + monto_interes_por_cuota` |
| 5 | No crear plan si la venta ya tiene uno activo |
| 6 | Al pagar cuota: registrar abono en `caja_sesion_id` (orquestado desde Controller) |

**Orquestación:** El `VentasController::store()` orquesta la creación del plan si la venta se marca como plazos. Es la **instancia #8** documentada.

---

## 13. Módulo: Payroll / Nómina

### Service: `NominaService`

**Archivo:** `app/Modules/Payroll/Services/NominaService.php`

**Métodos públicos:**

| Método | Descripción |
|--------|-------------|
| `registrarEmpleado(array $data): Empleado` | Vincula usuario + datos laborales |
| `generarNomina(int $sucursalId, string $inicio, string $fin): Nomina` | Calcula nómina para todos los empleados activos |
| `pagarNomina(int $nominaId, int $cajaSesionId): void` | Marca como pagada, registra egreso |

**Reglas de dominio:**

| # | Regla |
|---|-------|
| 1 | 1 usuario = 1 empleado (`usuario_id` unique) |
| 2 | Percepciones = `salario_base / 30 * dias_trabajados` (extensible a bonos/comisiones) |
| 3 | Deducciones = 0 por defecto (extensible a ISR/IMSS/préstamos) |
| 4 | Al pagar nómina: registrar egreso en `caja_sesion_id` (Controller orquesta) |

---

## 14. Módulo: Préstamos (Loans)

### Service: `PrestamoService`

**Archivo:** `app/Modules/Prestamos/Services/PrestamoService.php`

**Métodos públicos:**

| Método | Descripción |
|--------|-------------|
| `registrar(array $data): Prestamo` | Crea préstamo, calcula monto a pagar |
| `registrarPago(int $prestamoId, array $data): PrestamoPago` | Actualiza saldo |
| `obtenerActivos(): Collection` | Préstamos con saldo pendiente > 0 |

**Reglas de dominio:**

| # | Regla |
|---|-------|
| 1 | `monto_a_pagar = monto + (monto * interes / 100)` |
| 2 | `saldo_pendiente = monto_a_pagar - sum(pagos.monto)` |
| 3 | Si `saldo_pendiente = 0`, `estado = 'pagado'` |
| 4 | No pagar más que `saldo_pendiente` |

---

## 15. Nuevos Roles y Permisos de Sistema

### Rol nuevo: `repartidor`

Se agrega al `NucleoRolesPermisosSeeder`:

```php
// Nuevo rol de sistema
[
    'nombre' => 'repartidor',
    'es_sistema' => true,
    'permisos' => [
        'pedidos.ver',
    ],
]
// El permiso 'pedidos.ver' es suficiente para que el repartidor solo vea sus pedidos asignados.
// La lógica de "ver solo mis pedidos" se maneja en el Controller, no en el permiso.
```

### Rol `vendedor` — permisos adicionales

Se agregan a `PERMISOS_VENDEDOR` en el seeder:

```php
'cotizaciones.ver',
'cotizaciones.crear',
'cuentas_cobrar.ver',
'cuentas_cobrar.registrar_abono',
'pedidos.ver',
'pedidos.crear',
'gift_cards.ver',
'crm.interacciones.ver',
'crm.interacciones.crear',
'loyalty.ver',
'notas_credito.ver',
'ventas_plazos.ver',
```

### Rol `admin` — automático (recibe todos los permisos nuevos por `Permiso::all()->pluck('id')`)

No requiere cambios.

---

## 16. Permisos Nuevos para Módulos de Prioridad Baja

Agregar al array `NucleoRolesPermisosSeeder::PERMISOS`:

```php
// Produccion
['modulo' => 'produccion', 'accion' => 'ver', 'nombre' => 'produccion.ver'],
['modulo' => 'produccion', 'accion' => 'crear', 'nombre' => 'produccion.crear'],
['modulo' => 'produccion', 'accion' => 'completar', 'nombre' => 'produccion.completar'],
['modulo' => 'produccion', 'accion' => 'transformar', 'nombre' => 'produccion.transformar'],

// Payroll
['modulo' => 'payroll', 'accion' => 'ver', 'nombre' => 'payroll.ver'],
['modulo' => 'payroll', 'accion' => 'crear', 'nombre' => 'payroll.crear'],
['modulo' => 'payroll', 'accion' => 'pagar', 'nombre' => 'payroll.pagar'],

// Prestamos
['modulo' => 'prestamos', 'accion' => 'ver', 'nombre' => 'prestamos.ver'],
['modulo' => 'prestamos', 'accion' => 'crear', 'nombre' => 'prestamos.crear'],
['modulo' => 'prestamos', 'accion' => 'pagar', 'nombre' => 'prestamos.pagar'],

// Ventas a Plazos
['modulo' => 'ventas_plazos', 'accion' => 'ver', 'nombre' => 'ventas_plazos.ver'],
['modulo' => 'ventas_plazos', 'accion' => 'crear', 'nombre' => 'ventas_plazos.crear'],
```

---

## 17. Seeders de Desarrollo

### `DesarrolloSeeder` extendido

Se agregan:

**Módulos alta/media prioridad:**
- 2 cuentas por cobrar (una pendiente, una con abonos)
- 1 cuenta por pagar pendiente
- 3 cotizaciones (una pendiente, una vencida, una convertida)
- 2 gift cards (una activa, una usada)
- 1 nota de crédito
- 2 pedidos (uno pendiente, uno entregado)
- Interacciones CRM para 2 clientes
- 100 puntos de loyalty para 1 cliente

**Módulos baja prioridad:**
- 12 unidades de medida (seed base: und, kg, l, m, bal, bol, cja, rol, par, pli, var, tbo)
- 3 insumos (harina, azúcar, mantequilla)
- 1 receta (pastel básico) vinculada a un producto demo
- 1 orden de producción pendiente
- 1 plan de venta a plazos con 6 cuotas
- 2 empleados (vinculados a usuarios demo existentes)
- 1 nómina generada (período actual)
- 1 préstamo activo

---

*Fin de 03_ESPECIFICACION_BACKEND.md*
