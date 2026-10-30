<?php

namespace App\Aplicacion\Ventas;

use App\Modules\GiftCards\Services\GiftCardService;
use App\Modules\NotasCredito\Services\NotaCreditoService;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Precios\Exceptions\CuponInvalidoException;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Services\PrecioService;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Support\Facades\DB;

/**
 * Caso de uso de venta que cruza Tpv con GiftCards, NotasCredito y Precios
 * (ARQ-03): la orquestacion vive aqui y la Action es dueña de la transaccion.
 */
class RegistrarVenta
{
    public function __construct(
        private readonly VentaService $ventaService,
        private readonly GiftCardService $giftCardService,
        private readonly NotaCreditoService $notaCreditoService,
        private readonly PrecioService $precioService,
    ) {}

    /**
     * @param  list<array{variante_id:int, cantidad:int}>  $items
     * @param  list<array{metodo_pago_id:int, monto:float|string}>  $pagos
     */
    public function ejecutar(
        int $clienteId,
        array $items,
        array $pagos,
        ?string $cuponCodigo,
        float $descuentoManual,
        ?string $giftCardCodigo,
        ?int $notaCreditoId,
        Usuario $usuario,
    ): Venta {
        $tenantId = $usuario->tenant_id;

        $cuponId = null;
        $descuentoCupon = 0.0;

        if (! empty($cuponCodigo)) {
            $cupon = Cupon::where('codigo', $cuponCodigo)->first();

            if (! $cupon) {
                throw new CuponInvalidoException($cuponCodigo);
            }

            $cuponId = $cupon->id;
        }

        $metodoPagoGiftCard = MetodoPago::sinTenant()->where('nombre', 'Gift Card')->first();
        $metodoPagoNotaCredito = MetodoPago::sinTenant()->where('nombre', 'Nota de Crédito')->first();

        [, $subtotal] = $this->ventaService->cotizarItems($tenantId, $items);

        if ($cuponId && ! empty($cuponCodigo)) {
            $resultadoCupon = $this->precioService->aplicarCupon($cuponCodigo, $subtotal);
            $descuentoCupon = $resultadoCupon->descuento;
        }

        return DB::transaction(function () use (
            $items,
            $pagos,
            $usuario,
            $tenantId,
            $clienteId,
            $cuponId,
            $descuentoManual,
            $descuentoCupon,
            $giftCardCodigo,
            $notaCreditoId,
            $metodoPagoGiftCard,
            $metodoPagoNotaCredito,
            $subtotal,
        ) {
            $totalEstimado = round($subtotal - $descuentoManual - $descuentoCupon, 2);
            $pagosExtra = [];

            if (! empty($giftCardCodigo) && $metodoPagoGiftCard) {
                $giftCard = $this->giftCardService->validarParaPago($giftCardCodigo);
                $montoGiftCard = min((float) $giftCard->saldo_actual, $totalEstimado);
                $this->giftCardService->descontarSaldo($giftCard->id, $montoGiftCard);
                $pagosExtra[] = ['metodo_pago_id' => $metodoPagoGiftCard->id, 'monto' => $montoGiftCard];
            }

            if (! empty($notaCreditoId) && $metodoPagoNotaCredito) {
                $notaCredito = $this->notaCreditoService->validarParaPago($notaCreditoId);
                $montoNC = min((float) $notaCredito->saldo_disponible, $totalEstimado);
                $pagosExtra[] = ['metodo_pago_id' => $metodoPagoNotaCredito->id, 'monto' => $montoNC];
            }

            $venta = $this->ventaService->registrarVenta(
                [
                    'tenant_id' => $tenantId,
                    'sucursal_id' => $usuario->sucursal_id,
                    'usuario_id' => $usuario->id,
                    'cliente_id' => $clienteId,
                    'cupon_id' => $cuponId,
                    'descuento_manual' => $descuentoManual,
                ],
                $items,
                array_merge($pagos, $pagosExtra),
            );

            if (! empty($notaCreditoId)) {
                $montoNC = collect($pagosExtra)->where('metodo_pago_id', $metodoPagoNotaCredito?->id)->first()['monto'] ?? 0;

                if ($montoNC > 0) {
                    $this->notaCreditoService->usarEnVenta($notaCreditoId, $venta->id, $montoNC);
                }
            }

            return $venta;
        });
    }
}
