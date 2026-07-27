<?php

namespace App\Modules\Tpv\Services;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Services\PrecioService;
use App\Modules\Tpv\Exceptions\CajaSesionNoAbiertaException;
use App\Modules\Tpv\Exceptions\PagoNoCuadraException;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaDetalle;
use App\Modules\Tpv\Models\VentaPago;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Unico punto de entrada para registrar y anular ventas. Nunca acepta un
 * precio de linea calculado afuera -- siempre resuelve via
 * PrecioService::calcularDescuento(). Nunca toca inventario_stock
 * directamente -- siempre via InventarioService::registrarMovimiento().
 * Todo dentro de una sola transaccion: si cualquier linea falla (stock
 * insuficiente, pago que no cuadra, tenant inconsistente), la venta
 * completa se revierte -- ninguna linea ni movimiento de stock queda a
 * medias.
 */
class VentaService
{
    public function __construct(
        private readonly PrecioService $precioService,
        private readonly InventarioService $inventarioService,
    ) {
    }

    /**
     * @param  array{tenant_id:int, sucursal_id:int, usuario_id:int, cliente_id:int, cupon_id?:?int, descuento_manual?:float, abono_previo?:float, es_venta_sombra?:bool}  $datosVenta
     * @param  list<array{variante_id:int, cantidad:int}>  $items
     * @param  list<array{metodo_pago_id:int, monto:float}>  $pagos
     *
     * @throws CajaSesionNoAbiertaException  si la sucursal no tiene una caja abierta.
     * @throws \App\Modules\Inventario\Exceptions\StockInsuficienteException  si alguna linea no tiene stock suficiente.
     * @throws PagoNoCuadraException  si la suma de pagos no coincide con el monto a cobrar.
     */
    public function registrarVenta(array $datosVenta, array $items, array $pagos): Venta
    {
        if ($items === []) {
            throw new InvalidArgumentException('Una venta necesita al menos una linea.');
        }

        // No se rechaza $pagos === [] aqui: es valido cuando abono_previo ya
        // cubre el total completo (liquidacion de un apartado, ver
        // ApartadoService::liquidar()). verificarPagos() abajo sigue
        // rechazando cualquier venta normal (abono_previo=0) sin pagos que
        // cuadren, solo que con PagoNoCuadraException en vez de un guard
        // generico -- una sola ruta de validacion para el monto a cobrar.

        $tenantId = $datosVenta['tenant_id'];
        $sucursalId = $datosVenta['sucursal_id'];
        $cuponId = $datosVenta['cupon_id'] ?? null;
        $abonoPrevio = round((float) ($datosVenta['abono_previo'] ?? 0), 2);
        $esVentaSombra = (bool) ($datosVenta['es_venta_sombra'] ?? false);

        return DB::transaction(function () use ($datosVenta, $items, $pagos, $tenantId, $sucursalId, $cuponId, $abonoPrevio, $esVentaSombra) {
            $cajaSesion = CajaSesion::sinTenant()
                ->where('sucursal_id', $sucursalId)
                ->where('estado', 'abierta')
                ->latest('id')
                ->first();

            if (! $cajaSesion) {
                throw new CajaSesionNoAbiertaException($sucursalId);
            }

            $this->verificarPertenencia($tenantId, $sucursalId, $datosVenta['cliente_id'], $cuponId);

            [$lineas, $subtotalItems] = $this->resolverLineas($tenantId, $items);

            $descuentoCupon = 0.0;

            if ($cuponId !== null) {
                $cupon = Cupon::sinTenant()->findOrFail($cuponId);
                $descuentoCupon = $this->precioService->aplicarCupon($cupon->codigo, $subtotalItems)->descuento;
            }

            $descuentoManual = round((float) ($datosVenta['descuento_manual'] ?? 0), 2);
            $total = round($subtotalItems - $descuentoCupon - $descuentoManual, 2);

            if ($total < 0) {
                throw new InvalidArgumentException('El total de la venta no puede quedar negativo.');
            }

            // abono_previo (ej. abonos de un apartado ya liquidados) reduce
            // el monto que esta venta necesita cobrar en pagos nuevos; nunca
            // negativo -- un apartado sobre-abonado no exige un pago
            // "negativo", solo no exige pago adicional.
            $montoACobrar = max(0.0, round($total - $abonoPrevio, 2));

            $this->verificarPagos($pagos, $montoACobrar);

            $venta = Venta::create([
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
                VentaDetalle::create([
                    'venta_id' => $venta->id,
                    'variante_id' => $linea['variante_id'],
                    'regla_precio_id' => $linea['regla_precio_id'],
                    'cantidad' => $linea['cantidad'],
                    'precio_unitario' => $linea['precio_unitario'],
                    'descuento_aplicado' => $linea['descuento_aplicado'],
                    'subtotal' => $linea['subtotal'],
                ]);

                // StockInsuficienteException aqui revierte TODA la venta (esta
                // linea, las anteriores, sus movimientos de kardex ya escritos):
                // DB::transaction hace rollback de todo el closure completo.
                $this->inventarioService->registrarMovimiento(
                    varianteId: $linea['variante_id'],
                    sucursalId: $sucursalId,
                    tipo: 'salida',
                    cantidad: $linea['cantidad'],
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
        });
    }

    /**
     * Revierte el movimiento de stock de cada linea (motivo='ajuste',
     * referenciando la venta original -- no 'devolucion', que es un
     * concepto distinto del modulo de Devoluciones; no 'venta', porque no
     * es una venta nueva) y marca la venta como anulada. No borra la venta
     * ni sus lineas.
     */
    public function anularVenta(Venta $venta, string $motivo, Usuario $usuario): Venta
    {
        if ($venta->estado === 'anulada') {
            throw new InvalidArgumentException("La venta {$venta->id} ya esta anulada.");
        }

        return DB::transaction(function () use ($venta, $motivo, $usuario) {
            foreach ($venta->detalles as $detalle) {
                $this->inventarioService->registrarMovimiento(
                    varianteId: $detalle->variante_id,
                    sucursalId: $venta->sucursal_id,
                    tipo: 'entrada',
                    cantidad: $detalle->cantidad,
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
        });
    }

    /**
     * Cotiza items via PrecioService sin crear ninguna fila -- expone la
     * misma autoridad de precios de registrarVenta() para que otros
     * modulos (ej. Devoluciones, para saber de antemano el total de los
     * items nuevos de un cambio antes de registrar la venta sombra) puedan
     * calcular un total sin duplicar la logica de precios ni el
     * InvalidArgumentException de tenant/variante inconsistente.
     *
     * @param  list<array{variante_id:int, cantidad:int}>  $items
     * @return array{0: list<array{variante_id:int, regla_precio_id:?int, cantidad:int, precio_unitario:float, descuento_aplicado:float, subtotal:float}>, 1: float}
     */
    public function cotizarItems(int $tenantId, array $items): array
    {
        return $this->resolverLineas($tenantId, $items);
    }

    /**
     * @param  list<array{variante_id:int, cantidad:int}>  $items
     * @return array{0: list<array{variante_id:int, regla_precio_id:?int, cantidad:int, precio_unitario:float, descuento_aplicado:float, subtotal:float}>, 1: float}
     */
    private function resolverLineas(int $tenantId, array $items): array
    {
        $lineas = [];
        $subtotal = 0.0;

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
                'regla_precio_id' => $resultado->regla?->id,
                'cantidad' => $item['cantidad'],
                'precio_unitario' => $resultado->precioUnitario,
                'descuento_aplicado' => $resultado->descuentoTotal,
                'subtotal' => $resultado->subtotalConDescuento(),
            ];

            $subtotal += $resultado->subtotalConDescuento();
        }

        return [$lineas, round($subtotal, 2)];
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
