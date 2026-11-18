<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Services;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Exceptions\StockInsuficienteException;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Inventario\Support\UnidadDeVariante;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Scopes\TenantScope;
use App\Modules\Nucleo\Support\Cantidad;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Services\PricingService;
use App\Modules\Precios\Support\Carrito;
use App\Modules\Precios\Support\ContextoPrecio;
use App\Modules\Precios\Support\FotoDePrecio;
use App\Modules\Precios\Support\LineaCarrito;
use App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException;
use App\Modules\Tpv\Exceptions\PagoNoCuadraException;
use App\Modules\Tpv\Exceptions\VentaTotalNegativoException;
use App\Modules\Tpv\Exceptions\VentaYaAnuladaException;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaDetalle;
use App\Modules\Tpv\Models\VentaLineaRegla;
use App\Modules\Tpv\Models\VentaPago;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Unico punto de entrada para registrar y anular ventas. Nunca acepta un
 * precio de linea calculado afuera -- siempre resuelve via
 * PricingService::cotizar(), salvo al liquidar un apartado, que copia la foto
 * de sus lineas tal como se apartaron (DAT-03, $fotosCopiadas). Cada linea
 * guarda su foto completa: precio, descuento, lista, reglas, impuesto, unidad,
 * factor y el costo promedio del stock bloqueado. Nunca toca inventario_stock
 * directamente -- siempre via InventarioService::registrarMovimientoConStock().
 * Todo dentro de una sola transaccion: si cualquier linea falla (stock
 * insuficiente, pago que no cuadra, tenant inconsistente), la venta
 * completa se revierte -- ninguna linea ni movimiento de stock queda a
 * medias.
 */
class VentaService
{
    public function __construct(
        private readonly PricingService $pricingService,
        private readonly InventarioService $inventarioService,
    ) {}

    /**
     * @param  array{tenant_id:int, sucursal_id:int, lista_precio_id?:?int, usuario_id:int, cliente_id:int, cupon_id?:?int, descuento_manual?:float, abono_previo?:float, es_venta_sombra?:bool}  $datosVenta
     * @param  list<array{variante_id:int, cantidad:int|float, presentacion_id?:int|null}>  $items
     * @param  list<array{metodo_pago_id:int, monto:float}>  $pagos
     * @param  array<int, InventarioStock>  $stocks
     * @param  list<array<string, mixed>>|null  $fotosCopiadas  DAT-03: lineas con su foto ya fijada (liquidar un apartado); no se recotizan.
     *
     * @throws CajaSesionNoAbiertaException si la sucursal no tiene una caja abierta.
     * @throws StockInsuficienteException si alguna linea no tiene stock suficiente.
     * @throws PagoNoCuadraException si la suma de pagos no coincide con el monto a cobrar.
     */
    public function registrarVentaConBloqueos(array $datosVenta, array $items, array $pagos, ?CajaSesion $cajaSesion, array $stocks, ?array $fotosCopiadas = null): Venta
    {
        $this->exigirTransaccion();
        if ($items === []) {
            throw new InvalidArgumentException('Una venta necesita al menos una linea.');
        }

        // No se rechaza $pagos === [] aqui: es valido cuando abono_previo ya
        // cubre el total completo (liquidacion de un apartado, ver
        // ApartadoService::liquidarConBloqueos()). verificarPagos() abajo sigue
        // rechazando cualquier venta normal (abono_previo=0) sin pagos que
        // cuadren, solo que con PagoNoCuadraException en vez de un guard
        // generico -- una sola ruta de validacion para el monto a cobrar.

        $tenantId = $datosVenta['tenant_id'];
        $sucursalId = $datosVenta['sucursal_id'];
        $cuponId = $datosVenta['cupon_id'] ?? null;
        $abonoPrevio = round((float) ($datosVenta['abono_previo'] ?? 0), 2);
        $esVentaSombra = (bool) ($datosVenta['es_venta_sombra'] ?? false);

        if (! $cajaSesion || $cajaSesion->getAttribute('estado') !== 'abierta') {
            throw new CajaSesionNoAbiertaException($sucursalId);
        }

        $this->verificarPertenencia($tenantId, $sucursalId, $datosVenta['cliente_id'], $cuponId);

        [$lineas, $subtotalItems, $descuentoCupon] = $fotosCopiadas === null
            ? $this->resolverLineas($tenantId, $items, new ContextoPrecio($tenantId, $sucursalId, $datosVenta['cliente_id'], CarbonImmutable::now(), $datosVenta['lista_precio_id'] ?? null), $cuponId)
            : $this->lineasCopiadas($fotosCopiadas, $cuponId);

        $descuentoManual = round((float) ($datosVenta['descuento_manual'] ?? 0), 2);
        $total = round($subtotalItems - $descuentoCupon - $descuentoManual, 2);

        if ($total < 0) {
            throw new VentaTotalNegativoException($subtotalItems, $descuentoManual, $descuentoCupon);
        }

        // abono_previo (ej. abonos de un apartado ya liquidados) reduce
        // el monto que esta venta necesita cobrar en pagos nuevos; nunca
        // negativo -- un apartado sobre-abonado no exige un pago
        // "negativo", solo no exige pago adicional.
        $montoACobrar = max(0.0, round($total - $abonoPrevio, 2));

        $this->verificarPagos($pagos, $montoACobrar);

        $venta = Venta::query()->create([
            'lista_precio_id' => $datosVenta['lista_precio_id'] ?? null,
            'tenant_id' => $tenantId,
            'sucursal_id' => $sucursalId,
            'caja_sesion_id' => $cajaSesion->id,
            'usuario_id' => $datosVenta['usuario_id'],
            'cliente_id' => $datosVenta['cliente_id'],
            'cupon_id' => $cuponId,
            'total' => $total,
            'descuento_cupon' => $descuentoCupon,
            'descuento_manual' => $descuentoManual,
            'abono_previo' => $abonoPrevio,
            'es_venta_sombra' => $esVentaSombra,
        ]);

        foreach ($lineas as $linea) {
            $this->crearLinea($venta, $linea, $stocks[$linea['variante_id']]);

            // StockInsuficienteException aqui revierte TODA la venta (esta
            // linea, las anteriores, sus movimientos de kardex ya escritos):
            // La Action hace rollback de la operación completa.
            $this->inventarioService->registrarMovimientoConStock(
                stock: $stocks[$linea['variante_id']],
                tipo: 'salida',
                cantidad: Cantidad::multiplicar($linea['cantidad'], $linea['factor']),
                motivo: 'venta',
                usuarioId: $datosVenta['usuario_id'],
                referenciaTabla: 'ventas',
                referenciaId: $venta->id,
            );
        }

        foreach ($pagos as $pago) {
            VentaPago::create([
                'venta_id' => $venta->id,
                'metodo_pago_id' => $pago['metodo_pago_id'],
                'monto' => $pago['monto'],
            ]);
        }

        return $venta->load('detalles', 'pagos');
    }

    /**
     * Revierte el movimiento de stock de cada linea (motivo='ajuste',
     * referenciando la venta original -- no 'devolucion', que es un
     * concepto distinto del modulo de Devoluciones; no 'venta', porque no
     * es una venta nueva) y marca la venta como anulada. No borra la venta
     * ni sus lineas.
     *
     * @param  array<int, InventarioStock>  $stocks
     */
    public function anularVentaConStocks(Venta $venta, string $motivo, Usuario $usuario, array $stocks): Venta
    {
        $this->exigirTransaccion();
        if ($venta->estado === 'anulada') {
            throw new VentaYaAnuladaException($venta->id);
        }

        foreach ($venta->detalles as $detalle) {
            $this->inventarioService->registrarMovimientoConStock(
                stock: $stocks[$detalle->variante_id],
                tipo: 'entrada',
                cantidad: Cantidad::multiplicar($detalle->cantidad, $detalle->getAttribute('factor')),
                motivo: 'ajuste',
                usuarioId: $usuario->id,
                referenciaTabla: 'ventas',
                referenciaId: $venta->id,
            );
        }

        $venta->update([
            'estado' => 'anulada',
            'motivo_anulacion' => $motivo,
            'fecha_anulacion' => now(),
            'usuario_anulacion_id' => $usuario->id,
        ]);

        return $venta->refresh();
    }

    private function exigirTransaccion(): void
    {
        if (DB::connection()->transactionLevel() === 0) {
            throw new \LogicException('VentaService requiere una transacción abierta por una Action.');
        }
    }

    /**
     * Cotiza items via PricingService sin crear ninguna fila -- expone la
     * misma autoridad de precios de registrarVentaConBloqueos() para que otros
     * modulos (ej. Devoluciones, para saber de antemano el total de los
     * items nuevos de un cambio antes de registrar la venta sombra) puedan
     * calcular un total sin duplicar la logica de precios ni el
     * InvalidArgumentException de tenant/variante inconsistente.
     *
     * @param  array<int|string, array{variante_id:int|string, cantidad:int|float, presentacion_id?:int|null}>  $items
     * @return array{0: list<array{variante_id:int, regla_precio_id:?int, cantidad:int|float, precio_unitario:float, descuento_aplicado:float, subtotal:float}|array{variante_id:int, regla_precio_id:?int, cantidad:int|float, precio_unitario:float, descuento_aplicado:float, subtotal:float, presentacion_id:int, presentacion_nombre:string, factor:string}>, 1: float}
     */
    public function cotizarItems(int $tenantId, array $items, ?ContextoPrecio $contexto = null): array
    {
        $cotizado = $this->resolverLineas($tenantId, $items, $contexto);
        // La foto completa solo la escribe registrarVentaConBloqueos(); aquí se conserva la forma
        // de siempre (precio, regla, descuento y subtotal por línea) para quien solo cotiza.
        $lineas = array_map(static function (array $linea): array {
            $presentacion = isset($linea['presentacion_id']) ? ['presentacion_id' => $linea['presentacion_id'], 'presentacion_nombre' => $linea['presentacion_nombre'], 'factor' => $linea['factor']] : [];

            return [...$presentacion, 'variante_id' => $linea['variante_id'], 'regla_precio_id' => $linea['regla_precio_id'], 'cantidad' => $linea['cantidad'], 'precio_unitario' => $linea['precio_unitario'], 'descuento_aplicado' => $linea['descuento_aplicado'], 'subtotal' => $linea['subtotal']];
        }, $cotizado[0]);

        return [$lineas, $cotizado[1]];
    }

    /**
     * @param  array<int|string, array{variante_id:int|string, cantidad:int|float, presentacion_id?:int|null}>  $items
     * @return array{0: list<array{variante_id:int, regla_precio_id:?int, cantidad:int|float, precio_unitario:float, descuento_aplicado:float, subtotal:float}|array{variante_id:int, regla_precio_id:?int, cantidad:int|float, precio_unitario:float, descuento_aplicado:float, subtotal:float, presentacion_id:int, presentacion_nombre:string, factor:string}>, 1: float, 2: float}
     */
    private function resolverLineas(int $tenantId, array $items, ?ContextoPrecio $contexto = null, ?int $cuponId = null): array
    {
        $items = array_values($items);
        $unidades = [];
        foreach ($items as $indice => $item) {
            if ($item['cantidad'] <= 0) {
                throw new InvalidArgumentException('La cantidad de cada linea debe ser mayor a cero.');
            }

            $variante = ProductoVariante::sinTenant()->with('producto')->findOrFail($item['variante_id']);

            if ($variante->producto->tenant_id !== $tenantId) {
                throw new InvalidArgumentException("La variante {$item['variante_id']} no pertenece al tenant {$tenantId}.");
            }

            if (! $variante instanceof ProductoVariante) {
                throw new InvalidArgumentException("La variante {$item['variante_id']} no existe.");
            }
            $unidades[$indice] = UnidadDeVariante::idPara($variante);
        }
        $codigo = $cuponId === null ? null : (string) Cupon::query()->withoutGlobalScope(TenantScope::class)->findOrFail($cuponId)->getAttribute('codigo');
        $cotizacion = $this->pricingService->cotizar(new Carrito(array_map(static fn (array $item): LineaCarrito => new LineaCarrito((int) $item['variante_id'], $item['cantidad'], $item['presentacion_id'] ?? null), $items), $codigo), $contexto ?? new ContextoPrecio($tenantId, null, null, CarbonImmutable::now()));
        $lineas = [];
        foreach ($items as $indice => $item) {
            $linea = $cotizacion->lineas[$indice];
            $metadatos = [];
            if ($linea->presentacionId !== null) {
                if ($linea->presentacionNombre === null) {
                    throw new \LogicException('La presentación cotizada requiere su nombre.');
                }
                $metadatos = ['presentacion_id' => $linea->presentacionId, 'presentacion_nombre' => $linea->presentacionNombre, 'factor' => $linea->factor];
            }
            $foto = FotoDePrecio::de($linea);
            $lineas[] = [
                ...$metadatos,
                ...$foto,
                'variante_id' => (int) $linea->varianteId,
                'cantidad' => $item['cantidad'],
                'descuento_aplicado' => $foto['descuento'],
                'unidad_medida_id' => $unidades[$indice],
                'subtotal' => $linea->total,
            ];
        }

        return [$lineas, $cotizacion->subtotal, $cotizacion->cupon->descuento ?? 0.0];
    }

    /**
     * DAT-03: escribe una linea con su foto completa y sus reglas combinadas. El costo es el
     * promedio vigente del stock bloqueado por la Action (DAT-15), tambien en una liquidacion.
     *
     * @param  array<string, mixed>  $linea
     */
    private function crearLinea(Venta $venta, array $linea, InventarioStock $stock): VentaDetalle
    {
        $detalle = VentaDetalle::create([
            'venta_id' => $venta->id,
            'variante_id' => $linea['variante_id'],
            'cantidad' => $linea['cantidad'],
            'presentacion_id' => $linea['presentacion_id'] ?? null,
            'presentacion_nombre' => $linea['presentacion_nombre'] ?? null,
            'precio_unitario' => $linea['precio_unitario'],
            'descuento_aplicado' => $linea['descuento_aplicado'],
            'lista_precio_id' => $linea['lista_precio_id'],
            'lista_precio_nombre' => $linea['lista_precio_nombre'],
            'regla_precio_id' => $linea['regla_precio_id'],
            'regla_nombre' => $linea['regla_nombre'],
            'costo_unitario' => $stock->getAttribute('costo_promedio'),
            'tasa_impuesto' => $linea['tasa_impuesto'],
            'exento' => $linea['exento'],
            'impuesto' => $linea['impuesto'],
            'unidad_medida_id' => $linea['unidad_medida_id'],
            'factor' => $linea['factor'],
            'subtotal' => $linea['subtotal'],
        ]);

        /** @var list<array{regla_precio_id: int, regla_nombre: string, descuento: float|string}> $reglas */
        $reglas = $linea['reglas'];
        foreach ($reglas as $regla) {
            VentaLineaRegla::create(['venta_detalle_id' => $detalle->id, ...$regla]);
        }

        return $detalle;
    }

    /**
     * DAT-03: al liquidar un apartado la venta cobra lo acordado al apartar. Las lineas llegan con
     * su foto (precio, descuento, reglas, lista e impuesto) y no pasan por PricingService.
     *
     * @param  list<array<string, mixed>>  $fotos
     * @return array{0: list<array<string, mixed>>, 1: float, 2: float}
     */
    private function lineasCopiadas(array $fotos, ?int $cuponId): array
    {
        if ($cuponId !== null) {
            throw new InvalidArgumentException('Una venta con lineas copiadas no admite cupon.');
        }

        $subtotal = Dinero::desde('0');
        foreach ($fotos as $foto) {
            $subtotal = $subtotal->sumar(Dinero::desde((string) $foto['subtotal']));
        }

        return [$fotos, (float) $subtotal->aCadena(), 0.0];
    }

    /**
     * Comparacion explicita contra el tenant_id recibido, no contra
     * TenantContext ambiental -- mismo criterio que
     * InventarioService::verificarMismoTenant().
     */
    private function verificarPertenencia(int $tenantId, int $sucursalId, int $clienteId, ?int $cuponId): void
    {
        $sucursal = Sucursal::sinTenant()->findOrFail($sucursalId);

        if ($sucursal->tenant_id !== $tenantId) {
            throw new InvalidArgumentException("La sucursal {$sucursalId} no pertenece al tenant {$tenantId}.");
        }

        $cliente = Cliente::sinTenant()->findOrFail($clienteId);

        if ($cliente->tenant_id !== $tenantId) {
            throw new InvalidArgumentException("El cliente {$clienteId} no pertenece al tenant {$tenantId}.");
        }

        if ($cuponId !== null) {
            $cupon = Cupon::sinTenant()->findOrFail($cuponId);

            if ($cupon->tenant_id !== $tenantId) {
                throw new InvalidArgumentException("El cupon {$cuponId} no pertenece al tenant {$tenantId}.");
            }
        }
    }

    /**
     * @param  list<array{metodo_pago_id:int, monto:float}>  $pagos
     */
    private function verificarPagos(array $pagos, float $total): void
    {
        $totalCentavos = (int) round($total * 100);
        $sumaCentavos = (int) round(array_sum(array_column($pagos, 'monto')) * 100);

        if ($sumaCentavos !== $totalCentavos) {
            throw new PagoNoCuadraException($total, $sumaCentavos / 100);
        }
    }
}
