<?php

declare(strict_types=1);

namespace App\Modules\Cotizaciones\Services;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Cotizaciones\Exceptions\CotizacionNoEditableException;
use App\Modules\Cotizaciones\Exceptions\CotizacionTotalNegativoException;
use App\Modules\Cotizaciones\Exceptions\CotizacionVencidaException;
use App\Modules\Cotizaciones\Exceptions\CotizacionYaConvertidaException;
use App\Modules\Cotizaciones\Exceptions\SinClienteException;
use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Cotizaciones\Models\CotizacionDetalle;
use App\Modules\Cotizaciones\Models\CotizacionLineaRegla;
use App\Modules\Inventario\Exceptions\StockInsuficienteException;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Support\CostoVigente;
use App\Modules\Inventario\Support\ImpuestoDeProducto;
use App\Modules\Inventario\Support\UnidadDeVariante;
use App\Modules\Nucleo\Exceptions\FotoIncompletaException;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Precios\Support\ContextoPrecio;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\VentaService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Unico punto de entrada para gestionar cotizaciones/presupuestos.
 * Las cotizaciones NO modifican stock ni registran pagos: son solo
 * presupuestos. Al convertir a venta, se delega en VentaService
 * (que si descuenta stock y registra pagos).
 *
 * Dependencias permitidas (modulos posteriores en el grafo):
 * - PricingService (modulo Precios, anterior a TPV)
 * - VentaService (modulo TPV, posterior a Precios)
 *
 * @see VentaService
 * @see PricingService
 */
class CotizacionService
{
    public function __construct(
        private readonly VentaService $ventaService,
    ) {}

    /**
     * Crea cotizacion con sus items. No modifica stock.
     *
     * @param  array{tenant_id:int, sucursal_id:int, usuario_id:int, cliente_id:?int, lista_precio_id?:?int, validez_dias?:int, descuento?:float, observaciones:?string, uso_cfdi:?string}  $data
     * @param  list<array<string, mixed>>  $items  líneas con precio y descuento resueltos (y lista y reglas si aplicaron)
     *
     * @throws InvalidArgumentException si cantidad <= 0 o variante no existe
     */
    public function crear(array $data, array $items): Cotizacion
    {
        $this->exigirTransaccion();

        if ($items === []) {
            throw new InvalidArgumentException('Una cotizacion necesita al menos un item.');
        }

        $tenantId = $data['tenant_id'];
        $validezDias = max(1, (int) ($data['validez_dias'] ?? 15));

        $numeroCotizacion = $this->generarNumeroCotizacion($tenantId);
        $fechaVencimiento = now()->addDays($validezDias)->toDateString();

        // Resolver precios via PricingService para cada item
        $lineas = [];
        $total = 0.0;
        $descuentoGlobal = round((float) ($data['descuento'] ?? 0), 2);

        foreach ($items as $item) {
            if ($item['cantidad'] <= 0) {
                throw new InvalidArgumentException('La cantidad de cada item debe ser mayor a cero.');
            }

            $variante = ProductoVariante::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->with('producto')->findOrFail((int) $item['variante_id']);

            if ((int) $variante->producto?->getAttribute('tenant_id') !== $tenantId) {
                throw new InvalidArgumentException("La variante {$item['variante_id']} no pertenece al tenant {$tenantId}.");
            }

            $linea = $this->lineaConFoto($item, $variante, (int) $data['sucursal_id']);
            $lineas[] = $linea;

            $total += $linea['subtotal'];
        }

        $subtotalCotizacion = round($total, 2);
        $total = round($subtotalCotizacion - $descuentoGlobal, 2);

        if ($total < 0) {
            throw new CotizacionTotalNegativoException($subtotalCotizacion, $descuentoGlobal);
        }

        $cotizacion = Cotizacion::create([
            'lista_precio_id' => $data['lista_precio_id'] ?? null,
            'tenant_id' => $tenantId,
            'sucursal_id' => $data['sucursal_id'],
            'cliente_id' => $data['cliente_id'] ?? null,
            'usuario_id' => $data['usuario_id'],
            'numero_cotizacion' => $numeroCotizacion,
            'total' => $total,
            'descuento' => $descuentoGlobal,
            'validez_dias' => $validezDias,
            'estado' => 'pendiente',
            'observaciones' => $data['observaciones'] ?? null,
            'fecha_vencimiento' => $fechaVencimiento,
            'uso_cfdi' => $data['uso_cfdi'] ?? null,
        ]);

        foreach ($lineas as $linea) {
            $this->crearDetalle($cotizacion, $linea);
        }

        return $cotizacion->load('detalles');

    }

    /**
     * Actualiza cotizacion y sus items (borra y reinserta).
     * Solo si estado = 'pendiente'.
     *
     * @param  array<string, mixed>  $data
     * @param  list<array<string, mixed>>  $items  líneas con precio y descuento resueltos (y lista y reglas si aplicaron)
     */
    public function actualizarConCotizacion(Cotizacion $cotizacion, array $data, array $items): Cotizacion
    {
        $this->exigirTransaccion();

        $id = (int) $cotizacion->getKey();

        if ($cotizacion->estado !== 'pendiente') {
            throw new CotizacionNoEditableException($id, $cotizacion->estado);
        }

        $validezDias = max(1, (int) ($data['validez_dias'] ?? $cotizacion->validez_dias));
        $fechaVencimiento = $cotizacion->created_at->addDays($validezDias)->toDateString();

        // Recalcular total con nuevos items
        $lineas = [];
        $total = 0.0;
        $descuentoGlobal = round((float) ($data['descuento'] ?? $cotizacion->descuento), 2);

        foreach ($items as $item) {
            if ($item['cantidad'] <= 0) {
                throw new InvalidArgumentException('La cantidad de cada item debe ser mayor a cero.');
            }

            $variante = ProductoVariante::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->with('producto')->findOrFail((int) $item['variante_id']);

            if ((int) $variante->producto?->getAttribute('tenant_id') !== $cotizacion->tenant_id) {
                throw new InvalidArgumentException("La variante {$item['variante_id']} no pertenece al tenant.");
            }

            $linea = $this->lineaConFoto($item, $variante, (int) $cotizacion->getAttribute('sucursal_id'));
            $lineas[] = $linea;

            $total += $linea['subtotal'];
        }

        $subtotalCotizacion = round($total, 2);
        $total = round($subtotalCotizacion - $descuentoGlobal, 2);

        if ($total < 0) {
            throw new CotizacionTotalNegativoException($subtotalCotizacion, $descuentoGlobal);
        }

        $cotizacion->update([
            ...(array_key_exists('lista_precio_id', $data) ? ['lista_precio_id' => $data['lista_precio_id']] : []),
            'cliente_id' => $data['cliente_id'] ?? $cotizacion->cliente_id,
            'total' => $total,
            'descuento' => $descuentoGlobal,
            'validez_dias' => $validezDias,
            'observaciones' => $data['observaciones'] ?? $cotizacion->observaciones,
            'fecha_vencimiento' => $fechaVencimiento,
            'uso_cfdi' => $data['uso_cfdi'] ?? $cotizacion->uso_cfdi,
        ]);

        // Borrar detalles anteriores y reinsertar
        $cotizacion->detalles()->delete();

        foreach ($lineas as $linea) {
            $this->crearDetalle($cotizacion, $linea);
        }

        return $cotizacion->refresh()->load('detalles');

    }

    /**
     * Marca como anulada. Solo si estado = 'pendiente'.
     */
    public function anularConCotizacion(Cotizacion $cotizacion): void
    {
        $this->exigirTransaccion();

        $id = (int) $cotizacion->getKey();

        if (! in_array($cotizacion->estado, ['pendiente', 'vencida'], true)) {
            throw new CotizacionNoEditableException($id, $cotizacion->estado);
        }

        $cotizacion->update(['estado' => 'anulada']);

    }

    /**
     * Convierte cotizacion en venta. Crea la venta con VentaService,
     * descuenta stock, registra pagos.
     *
     * @param  array{usuario_id:int, metodo_pago_id:int}  $dataVenta
     * @param  array<int, InventarioStock>  $stocks
     *
     * @throws CotizacionVencidaException
     * @throws CotizacionYaConvertidaException
     * @throws SinClienteException
     * @throws StockInsuficienteException
     */
    public function convertirConBloqueos(Cotizacion $cotizacion, array $dataVenta, ?CajaSesion $caja, array $stocks, ?string $folioVenta = null): Venta
    {
        $this->exigirTransaccion();

        $id = (int) $cotizacion->getKey();

        if ($cotizacion->estado === 'convertida') {
            throw new CotizacionYaConvertidaException($id);
        }

        if ($cotizacion->fecha_vencimiento && $cotizacion->fecha_vencimiento < now()->toDateString()) {
            throw new CotizacionVencidaException($id);
        }

        if (! $cotizacion->cliente_id) {
            throw new SinClienteException;
        }

        // Preparar items para VentaService
        $items = [];
        foreach ($cotizacion->detalles as $detalle) {
            $items[] = [
                'variante_id' => $detalle->variante_id,
                'cantidad' => $detalle->cantidad,
            ];
        }

        // El precio autoritativo es el que resuelve VentaService con
        // PricingService; una cotizacion con precio manual no debe fijar
        // el pago de la venta resultante.
        $tenantId = (int) $cotizacion->getAttribute('tenant_id');
        [, $totalVenta] = $this->ventaService->cotizarItems($tenantId, $items, new ContextoPrecio($tenantId, (int) $cotizacion->getAttribute('sucursal_id'), (int) $cotizacion->getAttribute('cliente_id'), CarbonImmutable::now(), $cotizacion->getAttribute('lista_precio_id')));

        $pagos = [[
            'metodo_pago_id' => $dataVenta['metodo_pago_id'],
            'monto' => $totalVenta,
        ]];

        $venta = $this->ventaService->registrarVentaConBloqueos(
            [
                'tenant_id' => $cotizacion->tenant_id,
                'sucursal_id' => $cotizacion->sucursal_id,
                'usuario_id' => $dataVenta['usuario_id'],
                'cliente_id' => $cotizacion->cliente_id,
                'lista_precio_id' => $cotizacion->getAttribute('lista_precio_id'),
            ],
            $items,
            $pagos,
            $caja,
            $stocks,
            folio: $folioVenta,
        );

        $cotizacion->update([
            'estado' => 'convertida',
            'venta_id' => $venta->id,
        ]);

        return $venta;

    }

    /**
     * Genera numero de cotizacion correlativo por tenant: COT-{correlativo}.
     */
    private function generarNumeroCotizacion(int $tenantId): string
    {
        $ultimo = Cotizacion::sinTenant()
            ->where('tenant_id', $tenantId)
            ->where('numero_cotizacion', 'like', 'COT-%')
            ->orderByDesc('id')
            ->first();

        $correlativo = 1;
        if ($ultimo) {
            $partes = explode('-', $ultimo->numero_cotizacion);
            $correlativo = ((int) end($partes)) + 1;
        }

        return 'COT-'.str_pad((string) $correlativo, 6, '0', STR_PAD_LEFT);
    }

    /**
     * DAT-03: la foto de una línea de cotización. Precio y descuento llegan ya resueltos
     * (ResolverPreciosCotizacion); si faltan, la operación falla. La tasa es la del producto, el
     * impuesto se desglosa del total de la línea (IVA incluido), la unidad sale de
     * UnidadDeVariante y el costo es el promedio vigente de la sucursal, leído sin bloqueo porque
     * la cotización no mueve stock. Lista y reglas son las que aplicaron, o null.
     *
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function lineaConFoto(array $item, ProductoVariante $variante, int $sucursalId): array
    {
        foreach (['precio_unitario', 'descuento'] as $campo) {
            if (! isset($item[$campo])) {
                throw new FotoIncompletaException($campo, (int) $variante->id);
            }
        }

        $producto = $variante->getRelationValue('producto');
        if (! $producto instanceof Producto) {
            throw new FotoIncompletaException('producto', (int) $variante->id);
        }

        $precioUnitario = round((float) $item['precio_unitario'], 2);
        $descuentoLinea = round((float) $item['descuento'], 2);
        $subtotal = round($precioUnitario * $item['cantidad'] - $descuentoLinea, 2);
        $configuracion = ConfiguracionTenant::sinTenant()->where('tenant_id', $producto->getAttribute('tenant_id'))->firstOrFail();
        [$tasa, $exento] = ImpuestoDeProducto::de($producto, $configuracion->getAttribute('tasa_iva_default'));

        return [
            'variante_id' => $variante->id,
            'cantidad' => $item['cantidad'],
            'precio_unitario' => $precioUnitario,
            'descuento' => $descuentoLinea,
            'lista_precio_id' => $item['lista_precio_id'] ?? null,
            'lista_precio_nombre' => $item['lista_precio_nombre'] ?? null,
            'regla_precio_id' => $item['regla_precio_id'] ?? null,
            'regla_nombre' => $item['regla_nombre'] ?? null,
            'reglas' => $item['reglas'] ?? [],
            'costo_unitario' => CostoVigente::sinBloqueo($sucursalId, (int) $variante->id),
            'tasa_impuesto' => $tasa,
            'exento' => $exento,
            'impuesto' => $exento ? '0.00' : Dinero::desde(number_format($subtotal, 2, '.', ''))->impuestoIncluido($tasa)->aCadena(),
            'unidad_medida_id' => UnidadDeVariante::idPara($variante),
            'factor' => '1.000',
            'subtotal' => $subtotal,
        ];
    }

    /** @param  array<string, mixed>  $linea */
    private function crearDetalle(Cotizacion $cotizacion, array $linea): void
    {
        $detalle = CotizacionDetalle::create([
            'cotizacion_id' => $cotizacion->id,
            ...array_diff_key($linea, ['reglas' => true]),
        ]);

        /** @var list<array{regla_precio_id: int, regla_nombre: string, descuento: float}> $reglas */
        $reglas = $linea['reglas'];
        foreach ($reglas as $regla) {
            CotizacionLineaRegla::create(['cotizacion_detalle_id' => $detalle->id, ...$regla]);
        }
    }

    private function exigirTransaccion(): void
    {
        if (DB::connection()->transactionLevel() === 0) {
            throw new \LogicException('CotizacionService requiere una transacción abierta por una Action.');
        }
    }
}
