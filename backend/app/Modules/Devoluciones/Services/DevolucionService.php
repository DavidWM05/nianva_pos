<?php

namespace App\Modules\Devoluciones\Services;

use App\Modules\Devoluciones\Exceptions\DevolucionPagoNoCuadraException;
use App\Modules\Devoluciones\Exceptions\DevolucionSobreVentaSombraException;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Devoluciones\Models\DevolucionItem;
use App\Modules\Devoluciones\Models\DevolucionPago;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Unico punto de entrada para registrar devoluciones y cambios. Reutiliza
 * la autoridad de precios y de venta ya establecida: los items 'devuelto'
 * se valoran al precio_unitario con el que REALMENTE se vendieron (leido
 * de venta_detalles de la venta origen, no recalculado), y los items
 * 'nuevo' de un cambio se valoran via VentaService (que a su vez usa
 * PrecioService) al crear la venta sombra -- nunca un precio inventado
 * aqui.
 */
class DevolucionService
{
    public function __construct(
        private readonly InventarioService $inventarioService,
        private readonly VentaService $ventaService,
    ) {
    }

    /**
     * @param  list<array{variante_id:int, cantidad:int, va_a_merma?:bool}>  $itemsDevueltos
     * @param  list<array{variante_id:int, cantidad:int}>  $itemsNuevos  Solo se usa si $tipo === 'cambio'.
     * @param  list<array{metodo_pago_id:int, monto:float}>  $pagos  Liquida la diferencia (abs(diferencia)), no el total de la devolucion.
     *
     * @throws DevolucionSobreVentaSombraException  si $ventaOrigen->es_venta_sombra y $tipo === 'devolucion'.
     * @throws DevolucionPagoNoCuadraException  si la suma de pagos no coincide con abs(diferencia).
     * @throws \App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException  si $tipo === 'cambio' y la sucursal no tiene caja abierta (la venta sombra la exige, como cualquier venta).
     */
    public function registrarDevolucion(
        Venta $ventaOrigen,
        string $tipo,
        array $itemsDevueltos,
        array $itemsNuevos,
        int $sucursalId,
        int $usuarioId,
        array $pagos,
        ?string $motivo = null,
    ): Devolucion {
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

        return DB::transaction(function () use ($ventaOrigen, $tipo, $itemsDevueltos, $itemsNuevos, $sucursalId, $usuarioId, $pagos, $motivo, $tenantId) {
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

                $ventaSombra = $this->ventaService->registrarVenta(
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
                );

                // El total real (con redondeos ya aplicados linea a linea)
                // es el de la venta creada, no la cotizacion previa.
                $montoCambio = (float) $ventaSombra->total;
            }

            $diferencia = round($montoCambio - $montoDevolucion, 2);

            $this->verificarPagosDiferencia($pagos, $diferencia);

            $devolucion = Devolucion::create([
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
            ]);

            foreach ($lineasDevueltas as $linea) {
                DevolucionItem::create([
                    'devolucion_id' => $devolucion->id,
                    'variante_id' => $linea['variante_id'],
                    'tipo' => 'devuelto',
                    'cantidad' => $linea['cantidad'],
                    'precio_unitario' => $linea['precio_unitario'],
                    'subtotal' => $linea['subtotal'],
                    'va_a_merma' => $linea['va_a_merma'],
                ]);

                if ($linea['va_a_merma']) {
                    // Va a merma: NO regresa a inventario_stock -- se
                    // pierde. A proposito no hay ninguna llamada a
                    // InventarioService en esta rama: el "continue" hace
                    // estructuralmente imposible que una linea marcada
                    // va_a_merma=true caiga en el registrarMovimiento() de
                    // abajo por error/descuido futuro.
                    continue;
                }

                $this->inventarioService->registrarMovimiento(
                    varianteId: $linea['variante_id'],
                    sucursalId: $sucursalId,
                    tipo: 'entrada',
                    cantidad: $linea['cantidad'],
                    motivo: 'devolucion',
                    usuarioId: $usuarioId,
                    referenciaTabla: 'devoluciones',
                    referenciaId: $devolucion->id,
                );
            }

            if ($ventaSombra !== null) {
                foreach ($ventaSombra->detalles as $detalle) {
                    DevolucionItem::create([
                        'devolucion_id' => $devolucion->id,
                        'variante_id' => $detalle->variante_id,
                        'tipo' => 'nuevo',
                        'cantidad' => $detalle->cantidad,
                        'precio_unitario' => $detalle->precio_unitario,
                        'subtotal' => $detalle->subtotal,
                        'va_a_merma' => false,
                    ]);
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
        });
    }

    /**
     * Valora cada item devuelto al precio_unitario con el que se vendio
     * realmente (venta_detalles de la venta origen) -- nunca una cotizacion
     * nueva de PrecioService, que podria haber cambiado desde la venta.
     *
     * Limitacion conocida y deliberada: solo valida que la cantidad
     * devuelta en ESTA transaccion no exceda lo vendido en esa linea. No
     * acumula contra devoluciones parciales previas de la misma venta (eso
     * exigiria sumar devolucion_items historicos por variante) -- fuera del
     * alcance pedido; se documenta aqui para que quede explicito.
     *
     * @param  list<array{variante_id:int, cantidad:int, va_a_merma?:bool}>  $itemsDevueltos
     * @return array{0: list<array{variante_id:int, cantidad:int, precio_unitario:float, subtotal:float, va_a_merma:bool}>, 1: float}
     */
    private function resolverItemsDevueltos(Venta $ventaOrigen, array $itemsDevueltos): array
    {
        $detallesOriginales = $ventaOrigen->detalles;
        $lineas = [];
        $total = 0.0;

        foreach ($itemsDevueltos as $item) {
            if ($item['cantidad'] <= 0) {
                throw new InvalidArgumentException('La cantidad de cada item devuelto debe ser mayor a cero.');
            }

            $detalleOriginal = $detallesOriginales->firstWhere('variante_id', $item['variante_id']);

            if ($detalleOriginal === null) {
                throw new InvalidArgumentException("La variante {$item['variante_id']} no forma parte de la venta {$ventaOrigen->id}.");
            }

            if ($item['cantidad'] > $detalleOriginal->cantidad) {
                throw new InvalidArgumentException(
                    "No se pueden devolver {$item['cantidad']} unidades de la variante {$item['variante_id']}: ".
                    "la venta {$ventaOrigen->id} solo vendio {$detalleOriginal->cantidad}."
                );
            }

            $precioUnitario = (float) $detalleOriginal->precio_unitario;
            $subtotal = round($precioUnitario * $item['cantidad'], 2);

            $lineas[] = [
                'variante_id' => $item['variante_id'],
                'cantidad' => $item['cantidad'],
                'precio_unitario' => $precioUnitario,
                'subtotal' => $subtotal,
                'va_a_merma' => (bool) ($item['va_a_merma'] ?? false),
            ];

            $total += $subtotal;
        }

        return [$lineas, round($total, 2)];
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
