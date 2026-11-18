<?php

declare(strict_types=1);

namespace App\Modules\Devoluciones\Services;

use App\Modules\Devoluciones\Exceptions\DevolucionExcedeCantidadVendidaException;
use App\Modules\Devoluciones\Exceptions\DevolucionPagoNoCuadraException;
use App\Modules\Devoluciones\Exceptions\DevolucionSobreVentaSombraException;
use App\Modules\Devoluciones\Exceptions\DevolucionVarianteNoVendidaException;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Devoluciones\Models\DevolucionItem;
use App\Modules\Devoluciones\Models\DevolucionLineaRegla;
use App\Modules\Devoluciones\Models\DevolucionPago;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Support\Cantidad;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaDetalle;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Unico punto de entrada para registrar devoluciones y cambios. Reutiliza
 * la autoridad de precios y de venta ya establecida: los items 'devuelto'
 * se valoran al precio_unitario con el que REALMENTE se vendieron (leido
 * de venta_detalles de la venta origen, no recalculado), y los items
 * 'nuevo' de un cambio se valoran via VentaService (que a su vez usa
 * PricingService) al crear la venta sombra -- nunca un precio inventado
 * aqui.
 */
class DevolucionService
{
    public function __construct(
        private readonly InventarioService $inventarioService,
        private readonly VentaService $ventaService,
    ) {}

    /**
     * @param  list<array{variante_id:int, cantidad:int|float, va_a_merma?:bool, venta_detalle_id?:int}>  $itemsDevueltos
     * @param  list<array{variante_id:int, cantidad:int|float}>  $itemsNuevos  Solo se usa si $tipo === 'cambio'.
     * @param  list<array{metodo_pago_id:int, monto:float}>  $pagos  Liquida la diferencia (abs(diferencia)), no el total de la devolucion.
     * @param  array<int, InventarioStock>  $stocks
     *
     * @throws DevolucionSobreVentaSombraException si $ventaOrigen->es_venta_sombra y $tipo === 'devolucion'.
     * @throws DevolucionPagoNoCuadraException si la suma de pagos no coincide con abs(diferencia).
     * @throws CajaSesionNoAbiertaException si $tipo === 'cambio' y la sucursal no tiene caja abierta (la venta sombra la exige, como cualquier venta).
     */
    public function registrarDevolucionConBloqueos(
        Venta $ventaOrigen,
        string $tipo,
        array $itemsDevueltos,
        array $itemsNuevos,
        int $sucursalId,
        int $usuarioId,
        array $pagos,
        ?string $motivo = null,
        string $tipoReembolso = 'efectivo',
        ?CajaSesion $caja = null,
        array $stocks = [],
    ): Devolucion {
        $this->exigirTransaccion();
        if (! in_array($tipo, ['devolucion', 'cambio'], true)) {
            throw new InvalidArgumentException("Tipo de devolucion invalido: {$tipo}");
        }

        if ($itemsDevueltos === []) {
            throw new InvalidArgumentException('Una devolucion necesita al menos un item devuelto.');
        }

        if ($tipo === 'devolucion' && $itemsNuevos !== []) {
            throw new InvalidArgumentException("Una devolucion de tipo 'devolucion' no acepta items nuevos -- usa tipo 'cambio'.");
        }

        if ($tipo === 'cambio' && $itemsNuevos === []) {
            throw new InvalidArgumentException("Un 'cambio' necesita al menos un item nuevo.");
        }

        // Una venta sombra ya es, ella misma, el resultado de un cambio
        // anterior -- no tiene sentido "devolverla sin mas" (no genero un
        // cobro propio que reembolsar, ver mas abajo). Un cambio SI puede
        // encadenarse sobre ella (cambio de un cambio): para eso existe
        // venta_sombra_id, tal como preveia el documento de arquitectura.
        if ($tipo === 'devolucion' && $ventaOrigen->es_venta_sombra) {
            throw new DevolucionSobreVentaSombraException($ventaOrigen->id);
        }

        $tenantId = $ventaOrigen->tenant_id;

        $this->verificarSucursal($tenantId, $sucursalId);

        [$lineasDevueltas, $montoDevolucion] = $this->resolverItemsDevueltos($ventaOrigen, $itemsDevueltos);

        $ventaSombra = null;
        $montoCambio = 0.0;

        if ($tipo === 'cambio') {
            // Cotiza primero (sin escribir nada) para saber el total
            // exacto que tendra la venta sombra, y pasarlo como
            // abono_previo -- asi registrarVenta() no exige pagos
            // propios para ella: su liquidacion real ocurre via
            // devolucion_pagos (la diferencia), no via venta_pagos.
            [, $montoCambio] = $this->ventaService->cotizarItems($tenantId, $itemsNuevos);

            $ventaSombra = $this->ventaService->registrarVentaConBloqueos(
                datosVenta: [
                    'tenant_id' => $tenantId,
                    'sucursal_id' => $sucursalId,
                    'usuario_id' => $usuarioId,
                    'cliente_id' => $ventaOrigen->cliente_id,
                    'es_venta_sombra' => true,
                    'abono_previo' => $montoCambio,
                ],
                items: $itemsNuevos,
                pagos: [],
                cajaSesion: $caja,
                stocks: $stocks,
            );

            // El total real (con redondeos ya aplicados linea a linea)
            // es el de la venta creada, no la cotizacion previa.
            $montoCambio = (float) $ventaSombra->total;
        }

        $diferencia = round($montoCambio - $montoDevolucion, 2);

        $this->verificarPagosDiferencia($pagos, $diferencia);

        $devolucion = Devolucion::query()->create([
            'tenant_id' => $tenantId,
            'sucursal_id' => $sucursalId,
            'venta_id' => $ventaOrigen->id,
            'venta_sombra_id' => $ventaSombra?->id,
            'usuario_id' => $usuarioId,
            'tipo' => $tipo,
            'monto_devolucion' => $montoDevolucion,
            'monto_cambio' => $montoCambio,
            'diferencia' => $diferencia,
            'motivo' => $motivo,
            'tipo_reembolso' => $tipoReembolso,
        ]);

        foreach ($lineasDevueltas as $linea) {
            // DAT-03: la linea devuelta copia la foto de la linea de venta original; no se recotiza.
            $this->crearItem($devolucion, 'devuelto', $linea['detalle'], $linea['cantidad'], $linea['subtotal'], $linea['va_a_merma']);

            if ($linea['va_a_merma']) {
                // Va a merma: NO regresa a inventario_stock -- se
                // pierde. A proposito no hay ninguna llamada a
                // InventarioService en esta rama: el "continue" hace
                // estructuralmente imposible que una linea marcada
                // va_a_merma=true caiga en el registrarMovimiento() de
                // abajo por error/descuido futuro.
                continue;
            }

            $this->inventarioService->registrarMovimientoConStock(
                stock: $stocks[$linea['variante_id']],
                tipo: 'entrada',
                cantidad: Cantidad::multiplicar($linea['cantidad'], $linea['factor']),
                motivo: 'devolucion',
                usuarioId: $usuarioId,
                referenciaTabla: 'devoluciones',
                referenciaId: $devolucion->id,
            );
        }

        if ($ventaSombra !== null) {
            // DAT-03: la linea nueva de un cambio copia la foto de la venta sombra, que si salio de
            // PricingService en el momento.
            foreach (VentaDetalle::query()->with('reglas')->where('venta_id', $ventaSombra->id)->get() as $detalle) {
                $this->crearItem($devolucion, 'nuevo', $detalle, $detalle->getAttribute('cantidad'), (string) $detalle->getAttribute('subtotal'), false);
            }
        }

        foreach ($pagos as $pago) {
            DevolucionPago::create([
                'devolucion_id' => $devolucion->id,
                'metodo_pago_id' => $pago['metodo_pago_id'],
                'monto' => $pago['monto'],
            ]);
        }

        return $devolucion->load('items', 'pagos');
    }

    private function exigirTransaccion(): void
    {
        if (DB::connection()->transactionLevel() === 0) {
            throw new \LogicException('DevolucionService requiere una transacción abierta por una Action.');
        }
    }

    /**
     * Valora cada item devuelto al precio_unitario con el que se vendio
     * realmente (venta_detalles de la venta origen) -- nunca una cotizacion
     * nueva de PricingService, que podria haber cambiado desde la venta.
     * Las presentaciones prorratean el subtotal original para conservar el
     * redondeo de la línea al devolver cantidades fraccionarias.
     *
     * Limitacion conocida y deliberada: solo valida que la cantidad
     * devuelta en ESTA transaccion no exceda lo vendido en esa linea. No
     * acumula contra devoluciones parciales previas de la misma venta (eso
     * exigiria sumar devolucion_items historicos por variante) -- fuera del
     * alcance pedido; se documenta aqui para que quede explicito.
     *
     * @param  list<array{variante_id:int, cantidad:int|float, va_a_merma?:bool, venta_detalle_id?:int}>  $itemsDevueltos
     * @return array{0: list<array{detalle: VentaDetalle, variante_id:int, cantidad:int|float, precio_unitario:float, subtotal:float, va_a_merma:bool, factor:string}>, 1: float}
     */
    private function resolverItemsDevueltos(Venta $ventaOrigen, array $itemsDevueltos): array
    {
        $detallesOriginales = $ventaOrigen->detalles()->with('reglas')->get();
        $lineas = [];
        $total = 0.0;

        foreach ($itemsDevueltos as $item) {
            if ($item['cantidad'] <= 0) {
                throw new InvalidArgumentException('La cantidad de cada item devuelto debe ser mayor a cero.');
            }

            $candidatos = $detallesOriginales->where('variante_id', $item['variante_id']);
            $detalleOriginal = isset($item['venta_detalle_id']) ? $candidatos->firstWhere('id', $item['venta_detalle_id']) : $candidatos->first();

            if (! $detalleOriginal instanceof VentaDetalle) {
                throw new DevolucionVarianteNoVendidaException($ventaOrigen->id, $item['variante_id']);
            }

            if ($item['cantidad'] > $detalleOriginal->getAttribute('cantidad')) {
                throw new DevolucionExcedeCantidadVendidaException(
                    $ventaOrigen->id,
                    $item['variante_id'],
                    $item['cantidad'],
                    $detalleOriginal->getAttribute('cantidad'),
                );
            }

            $precioUnitario = (float) $detalleOriginal->getAttribute('precio_unitario');
            $subtotal = $detalleOriginal->getAttribute('presentacion_nombre') !== null
                ? (float) Dinero::desde((string) $detalleOriginal->getAttribute('subtotal'))->proporcion(Cantidad::milesimas($item['cantidad']), Cantidad::milesimas($detalleOriginal->getAttribute('cantidad')))->aCadena()
                : round($precioUnitario * $item['cantidad'], 2);

            $lineas[] = [
                'detalle' => $detalleOriginal,
                'variante_id' => $item['variante_id'],
                'factor' => (string) $detalleOriginal->getAttribute('factor'),
                'cantidad' => $item['cantidad'],
                'precio_unitario' => $precioUnitario,
                'subtotal' => $subtotal,
                'va_a_merma' => (bool) ($item['va_a_merma'] ?? false),
            ];

            $total += $subtotal;
        }

        return [$lineas, round($total, 2)];
    }

    /**
     * DAT-03: escribe una linea de devolucion o cambio con la foto de la linea de venta de la que
     * sale. El precio, la lista, la regla, la tasa, el costo, la unidad y el factor se copian tal
     * cual; el descuento, el impuesto y el descuento de cada regla se prorratean por la cantidad,
     * como el subtotal con presentaciones.
     */
    private function crearItem(Devolucion $devolucion, string $tipo, VentaDetalle $origen, mixed $cantidad, float|string $subtotal, bool $vaAMerma): DevolucionItem
    {
        $parte = Cantidad::milesimas($cantidad);
        $todo = Cantidad::milesimas($origen->getAttribute('cantidad'));
        $prorrata = static fn (mixed $importe): string => Dinero::desde((string) $importe)->proporcion($parte, $todo)->aCadena();

        $item = DevolucionItem::create([
            'devolucion_id' => $devolucion->id,
            'variante_id' => $origen->getAttribute('variante_id'),
            'tipo' => $tipo,
            'cantidad' => $cantidad,
            'precio_unitario' => $origen->getAttribute('precio_unitario'),
            'descuento' => $prorrata($origen->getAttribute('descuento_aplicado')),
            'lista_precio_id' => $origen->getAttribute('lista_precio_id'),
            'lista_precio_nombre' => $origen->getAttribute('lista_precio_nombre'),
            'regla_precio_id' => $origen->getAttribute('regla_precio_id'),
            'regla_nombre' => $origen->getAttribute('regla_nombre'),
            'costo_unitario' => $origen->getAttribute('costo_unitario'),
            'tasa_impuesto' => $origen->getAttribute('tasa_impuesto'),
            'exento' => $origen->getAttribute('exento'),
            'impuesto' => $prorrata($origen->getAttribute('impuesto')),
            'unidad_medida_id' => $origen->getAttribute('unidad_medida_id'),
            'factor' => $origen->getAttribute('factor'),
            'subtotal' => $subtotal,
            'va_a_merma' => $vaAMerma,
        ]);

        foreach ($origen->reglas as $regla) {
            DevolucionLineaRegla::create([
                'devolucion_item_id' => $item->id,
                'regla_precio_id' => $regla->getAttribute('regla_precio_id'),
                'regla_nombre' => $regla->getAttribute('regla_nombre'),
                'descuento' => $prorrata($regla->getAttribute('descuento')),
            ]);
        }

        return $item;
    }

    private function verificarSucursal(int $tenantId, int $sucursalId): void
    {
        $sucursal = Sucursal::sinTenant()->findOrFail($sucursalId);

        if ($sucursal->tenant_id !== $tenantId) {
            throw new InvalidArgumentException("La sucursal {$sucursalId} no pertenece al tenant {$tenantId}.");
        }
    }

    /**
     * Los pagos de devolucion_pagos liquidan abs(diferencia): el signo ya
     * queda registrado en devoluciones.diferencia (negativo=reembolso,
     * positivo=cobro adicional), el monto del pago siempre es positivo.
     *
     * @param  list<array{metodo_pago_id:int, monto:float}>  $pagos
     */
    private function verificarPagosDiferencia(array $pagos, float $diferencia): void
    {
        $montoEsperadoCentavos = (int) round(abs($diferencia) * 100);
        $sumaCentavos = (int) round(array_sum(array_column($pagos, 'monto')) * 100);

        if ($sumaCentavos !== $montoEsperadoCentavos) {
            throw new DevolucionPagoNoCuadraException($diferencia, $sumaCentavos / 100);
        }
    }
}
