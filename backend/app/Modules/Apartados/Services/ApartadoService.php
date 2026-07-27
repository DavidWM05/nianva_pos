<?php

namespace App\Modules\Apartados\Services;

use App\Modules\Apartados\Exceptions\AbonoPagoNoCuadraException;
use App\Modules\Apartados\Exceptions\ApartadoEstadoInvalidoException;
use App\Modules\Apartados\Exceptions\ApartadoSaldoInsuficienteException;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Models\ApartadoAbono;
use App\Modules\Apartados\Models\ApartadoAbonoPago;
use App\Modules\Apartados\Models\ApartadoDetalle;
use App\Modules\Apartados\Support\ResultadoCancelacion;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Precios\Services\PrecioService;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Unico punto de entrada para crear, abonar, liquidar y cancelar apartados
 * (layaway). Decision de diseno documentada aqui porque el documento de
 * arquitectura no la resuelve explicitamente:
 *
 * Un apartado RESERVA stock descontando inventario_stock de inmediato --
 * exactamente como una venta -- en vez de usar un campo separado de "stock
 * reservado". Motivos:
 *
 *   1. El propio documento ya reserva 'apartado' como motivo valido en el
 *      ENUM de kardex (motivo VARCHAR/ENUM incluye 'apartado' junto a
 *      'venta','compra','devolucion','merma','ajuste'), senal fuerte de que
 *      la intencion original ya era tratarlo como un movimiento real de
 *      kardex, no como un contador aparte.
 *   2. InventarioService::registrarMovimiento() es el UNICO punto de
 *      escritura de inventario_stock en todo el sistema (invariante ya
 *      establecida por Inventario y reforzada por Tpv). Un campo de "stock
 *      reservado" separado crearia una segunda fuente de verdad sobre
 *      "cuanto puedo vender de esta variante" que Ventas y Compras tendrian
 *      que aprender a consultar tambien -- justo el tipo de acoplamiento
 *      implicito que este proyecto evita en todos los demas modulos.
 *   3. Es la semantica mas simple para el vendedor en piso: si esta
 *      apartado, no esta disponible para venderse a alguien mas, punto.
 *
 * La contraparte (liquidar/cancelar deben LIBERAR esa reserva) se resuelve
 * con un movimiento compensatorio 'entrada'/'ajuste' antes de re-descontar
 * (liquidar, via VentaService) o de dejarlo disponible (cancelar) -- ver
 * liquidar() y cancelar() abajo. Todo dentro de la misma transaccion que
 * hace el resto del metodo, asi que no hay ventana donde otro proceso
 * concurrente pueda tomar ese stock entre la liberacion y su siguiente uso.
 */
class ApartadoService
{
    public function __construct(
        private readonly PrecioService $precioService,
        private readonly InventarioService $inventarioService,
        private readonly VentaService $ventaService,
    ) {
    }

    /**
     * @param  array{tenant_id:int, sucursal_id:int, cliente_id:int, usuario_id:int, fecha_vencimiento?:?string, notas?:?string}  $datosApartado
     * @param  list<array{variante_id:int, cantidad:int}>  $items
     */
    public function crearApartado(array $datosApartado, array $items): Apartado
    {
        if ($items === []) {
            throw new InvalidArgumentException('Un apartado necesita al menos una linea.');
        }

        $tenantId = $datosApartado['tenant_id'];
        $sucursalId = $datosApartado['sucursal_id'];

        return DB::transaction(function () use ($datosApartado, $items, $tenantId, $sucursalId) {
            $this->verificarPertenencia($tenantId, $sucursalId, $datosApartado['cliente_id']);

            [$lineas, $total] = $this->resolverLineas($tenantId, $items);

            $apartado = Apartado::create([
                'tenant_id' => $tenantId,
                'sucursal_id' => $sucursalId,
                'cliente_id' => $datosApartado['cliente_id'],
                'usuario_id' => $datosApartado['usuario_id'],
                'total' => $total,
                'estado' => 'activo',
                'fecha_vencimiento' => $datosApartado['fecha_vencimiento'] ?? null,
                'notas' => $datosApartado['notas'] ?? null,
            ]);

            foreach ($lineas as $linea) {
                ApartadoDetalle::create([
                    'apartado_id' => $apartado->id,
                    'variante_id' => $linea['variante_id'],
                    'cantidad' => $linea['cantidad'],
                    'precio_unitario' => $linea['precio_unitario'],
                    'subtotal' => $linea['subtotal'],
                ]);

                // Reserva: descuenta inventario_stock igual que una venta (ver docblock de clase).
                $this->inventarioService->registrarMovimiento(
                    varianteId: $linea['variante_id'],
                    sucursalId: $sucursalId,
                    tipo: 'salida',
                    cantidad: $linea['cantidad'],
                    motivo: 'apartado',
                    usuarioId: $datosApartado['usuario_id'],
                    referenciaTabla: 'apartados',
                    referenciaId: $apartado->id,
                );
            }

            return $apartado->load('detalles');
        });
    }

    /**
     * @param  list<array{metodo_pago_id:int, monto:float}>  $pagos
     *
     * @throws AbonoPagoNoCuadraException  si la suma de pagos no coincide con el monto del abono.
     */
    public function registrarAbono(Apartado $apartado, float $monto, int $usuarioId, array $pagos, ?string $notas = null): ApartadoAbono
    {
        if ($apartado->estado !== 'activo') {
            throw new ApartadoEstadoInvalidoException($apartado->id, $apartado->estado, 'abonar');
        }

        if ($pagos === []) {
            throw new InvalidArgumentException('Un abono necesita al menos un metodo de pago.');
        }

        $monto = round($monto, 2);
        $montoCentavos = (int) round($monto * 100);
        $sumaCentavos = (int) round(array_sum(array_column($pagos, 'monto')) * 100);

        if ($sumaCentavos !== $montoCentavos) {
            throw new AbonoPagoNoCuadraException($monto, $sumaCentavos / 100);
        }

        return DB::transaction(function () use ($apartado, $monto, $usuarioId, $pagos, $notas) {
            $abono = ApartadoAbono::create([
                'apartado_id' => $apartado->id,
                'monto' => $monto,
                'usuario_id' => $usuarioId,
                'notas' => $notas,
            ]);

            foreach ($pagos as $pago) {
                ApartadoAbonoPago::create([
                    'abono_id' => $abono->id,
                    'metodo_pago_id' => $pago['metodo_pago_id'],
                    'monto' => $pago['monto'],
                ]);
            }

            $apartado->update([
                'total_abonado' => round((float) $apartado->total_abonado + $monto, 2),
            ]);

            return $abono->load('pagos');
        });
    }

    /**
     * Libera la reserva de stock de cada linea (entrada/ajuste) y delega la
     * venta real a VentaService::registrarVenta(), que la vuelve a
     * descontar (salida/venta) -- neto cero en stock, pero con un rastro de
     * kardex legible: reservado por el apartado -> liberado al liquidar ->
     * consumido por la venta.
     *
     * Los items se re-cotizan via PrecioService dentro de
     * VentaService::registrarVenta() (misma autoridad de precios que
     * cualquier otra venta) -- si una regla de precio cambio entre la
     * creacion del apartado y su liquidacion, el total de la venta
     * resultante puede diferir del total original del apartado. No se
     * implementa proteccion de precio ("price lock"): el documento no la
     * pide y no es un requisito trivial -- se deja como limitacion conocida.
     *
     * abono_previo = total_abonado le indica a VentaService cuanto ya se
     * cobro antes (via abonos), asi que exige pagos nuevos solo por el
     * residual (normalmente 0 si el apartado ya esta completamente pagado).
     *
     * @throws ApartadoSaldoInsuficienteException  si total_abonado < total.
     */
    public function liquidar(Apartado $apartado, int $usuarioId): Apartado
    {
        if ($apartado->estado !== 'activo') {
            throw new ApartadoEstadoInvalidoException($apartado->id, $apartado->estado, 'liquidar');
        }

        if ((float) $apartado->total_abonado < (float) $apartado->total) {
            throw new ApartadoSaldoInsuficienteException($apartado->id, (float) $apartado->total, (float) $apartado->total_abonado);
        }

        return DB::transaction(function () use ($apartado, $usuarioId) {
            $detalles = $apartado->detalles;

            foreach ($detalles as $detalle) {
                $this->inventarioService->registrarMovimiento(
                    varianteId: $detalle->variante_id,
                    sucursalId: $apartado->sucursal_id,
                    tipo: 'entrada',
                    cantidad: $detalle->cantidad,
                    motivo: 'ajuste',
                    usuarioId: $usuarioId,
                    referenciaTabla: 'apartados',
                    referenciaId: $apartado->id,
                );
            }

            $items = $detalles->map(fn (ApartadoDetalle $detalle) => [
                'variante_id' => $detalle->variante_id,
                'cantidad' => $detalle->cantidad,
            ])->all();

            $venta = $this->ventaService->registrarVenta(
                datosVenta: [
                    'tenant_id' => $apartado->tenant_id,
                    'sucursal_id' => $apartado->sucursal_id,
                    'usuario_id' => $usuarioId,
                    'cliente_id' => $apartado->cliente_id,
                    'abono_previo' => (float) $apartado->total_abonado,
                ],
                items: $items,
                pagos: [],
            );

            $apartado->update([
                'venta_id' => $venta->id,
                'estado' => 'completado',
                'fecha_completado' => now(),
            ]);

            return $apartado->refresh()->load('venta');
        });
    }

    /**
     * Libera la reserva de stock de cada linea (entrada/ajuste) y marca el
     * apartado como cancelado. Los abonos ya cobrados NO se revierten aqui
     * -- como se pide, eso es una decision de negocio (reembolso en
     * efectivo, nota de credito, etc.) fuera del alcance de este modulo. El
     * resultado solo senala cuanto quedo pendiente de resolver.
     */
    public function cancelar(Apartado $apartado, string $motivo, Usuario $usuario): ResultadoCancelacion
    {
        if ($apartado->estado !== 'activo') {
            throw new ApartadoEstadoInvalidoException($apartado->id, $apartado->estado, 'cancelar');
        }

        return DB::transaction(function () use ($apartado, $motivo, $usuario) {
            foreach ($apartado->detalles as $detalle) {
                $this->inventarioService->registrarMovimiento(
                    varianteId: $detalle->variante_id,
                    sucursalId: $apartado->sucursal_id,
                    tipo: 'entrada',
                    cantidad: $detalle->cantidad,
                    motivo: 'ajuste',
                    usuarioId: $usuario->id,
                    referenciaTabla: 'apartados',
                    referenciaId: $apartado->id,
                );
            }

            $apartado->update([
                'estado' => 'cancelado',
                'fecha_cancelado' => now(),
                'usuario_cancelacion_id' => $usuario->id,
                'motivo_cancelacion' => $motivo,
            ]);

            $montoAbonadoPendiente = (float) $apartado->total_abonado;

            return new ResultadoCancelacion(
                apartado: $apartado->refresh(),
                tieneAbonosPendientes: $montoAbonadoPendiente > 0.0,
                montoAbonadoPendiente: $montoAbonadoPendiente,
            );
        });
    }

    /**
     * @param  list<array{variante_id:int, cantidad:int}>  $items
     * @return array{0: list<array{variante_id:int, cantidad:int, precio_unitario:float, subtotal:float}>, 1: float}
     */
    private function resolverLineas(int $tenantId, array $items): array
    {
        $lineas = [];
        $total = 0.0;

        foreach ($items as $item) {
            if ($item['cantidad'] <= 0) {
                throw new InvalidArgumentException('La cantidad de cada linea debe ser mayor a cero.');
            }

            $variante = ProductoVariante::sinTenant()->with('producto')->findOrFail($item['variante_id']);

            if ($variante->producto->tenant_id !== $tenantId) {
                throw new InvalidArgumentException("La variante {$item['variante_id']} no pertenece al tenant {$tenantId}.");
            }

            $resultado = $this->precioService->calcularDescuento($variante, $item['cantidad']);

            $lineas[] = [
                'variante_id' => $variante->id,
                'cantidad' => $item['cantidad'],
                'precio_unitario' => $resultado->precioUnitario,
                'subtotal' => $resultado->subtotalConDescuento(),
            ];

            $total += $resultado->subtotalConDescuento();
        }

        return [$lineas, round($total, 2)];
    }

    /**
     * Comparacion explicita contra el tenant_id recibido, no contra
     * TenantContext ambiental -- mismo criterio que
     * VentaService::verificarPertenencia().
     */
    private function verificarPertenencia(int $tenantId, int $sucursalId, int $clienteId): void
    {
        $sucursal = Sucursal::sinTenant()->findOrFail($sucursalId);

        if ($sucursal->tenant_id !== $tenantId) {
            throw new InvalidArgumentException("La sucursal {$sucursalId} no pertenece al tenant {$tenantId}.");
        }

        $cliente = Cliente::sinTenant()->findOrFail($clienteId);

        if ($cliente->tenant_id !== $tenantId) {
            throw new InvalidArgumentException("El cliente {$clienteId} no pertenece al tenant {$tenantId}.");
        }
    }
}
