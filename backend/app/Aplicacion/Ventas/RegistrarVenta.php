<?php

declare(strict_types=1);

namespace App\Aplicacion\Ventas;

use App\Aplicacion\Inventario\RegistrarMovimiento;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\GiftCards\Services\GiftCardService;
use App\Modules\Inventario\Dtos\MovimientoInventarioDto;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Services\NotaCreditoService;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Precios\Exceptions\CuponInvalidoException;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Services\PricingService;
use App\Modules\Precios\Support\Carrito;
use App\Modules\Precios\Support\ContextoPrecio;
use App\Modules\Precios\Support\LineaCarrito;
use App\Modules\Tpv\Dtos\CrearVentaDto;
use App\Modules\Tpv\Dtos\LineaVentaDto;
use App\Modules\Tpv\Dtos\PagoDto;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\VentaService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Caso de uso de venta que cruza Tpv con GiftCards, NotasCredito y Precios
 * (ARQ-03): la orquestacion vive aqui y la Action es dueña de la transaccion.
 */
class RegistrarVenta
{
    public function __construct(
        private readonly VentaService $ventaService,
        private readonly RegistrarMovimiento $movimiento,
        private readonly GiftCardService $giftCardService,
        private readonly NotaCreditoService $notaCreditoService,
        private readonly PricingService $pricingService,
    ) {}

    /** Cuando la llama otra Action, el savepoint participa de su transacción y de su rollback. */
    public function ejecutar(CrearVentaDto $dto, Usuario $usuario): Venta
    {
        $clienteId = $dto->clienteId;
        $items = array_map(
            fn (LineaVentaDto $linea) => [
                'variante_id' => $linea->varianteId,
                'cantidad' => $linea->cantidad,
            ],
            $dto->items,
        );
        $pagos = array_map(
            fn (PagoDto $pago) => [
                'metodo_pago_id' => $pago->metodoPagoId,
                'monto' => $pago->monto,
            ],
            $dto->pagos,
        );
        $cuponCodigo = $dto->cuponCodigo;
        $descuentoManual = $dto->descuentoManual;
        $giftCardCodigo = $dto->giftCardCodigo;
        $notaCreditoId = $dto->notaCreditoId;

        $tenantId = $usuario->tenant_id;
        $sucursalContextoId = $usuario->getAttribute('sucursal_id');

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

        foreach ($items as $item) {
            if ($item['cantidad'] <= 0) {
                throw new \InvalidArgumentException('La cantidad de cada linea debe ser mayor a cero.');
            }
        }
        $cotizacion = $this->pricingService->cotizar(new Carrito(array_map(static fn (array $item): LineaCarrito => new LineaCarrito($item['variante_id'], $item['cantidad']), $items), $cuponId && ! empty($cuponCodigo) ? $cuponCodigo : null), new ContextoPrecio($tenantId, $sucursalContextoId === null ? null : (int) $sucursalContextoId, $clienteId, CarbonImmutable::now()));
        $subtotal = $cotizacion->subtotal;
        $descuentoCupon = $cotizacion->cupon->descuento ?? 0.0;

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
            $caja = CajaSesion::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->where('sucursal_id', (int) $usuario->getAttribute('sucursal_id'))->where('estado', 'abierta')->latest('id')->lockForUpdate()->first();
            $notaCredito = null;
            $totalEstimado = round($subtotal - $descuentoManual - $descuentoCupon, 2);
            $pagosExtra = [];

            if (! empty($giftCardCodigo) && $metodoPagoGiftCard) {
                $giftCard = GiftCard::query()->where('codigo', $giftCardCodigo)->lockForUpdate()->firstOrFail();
                $this->giftCardService->validarTarjetaParaPago($giftCard);
                $montoGiftCard = min((float) $giftCard->saldo_actual, $totalEstimado);
                $this->giftCardService->descontarSaldoConTarjeta($giftCard, $montoGiftCard);
                $pagosExtra[] = ['metodo_pago_id' => $metodoPagoGiftCard->id, 'monto' => $montoGiftCard];
            }

            if (! empty($notaCreditoId) && $metodoPagoNotaCredito) {
                $notaCredito = NotaCredito::query()->whereKey($notaCreditoId)->lockForUpdate()->firstOrFail();
                $this->notaCreditoService->validarNotaParaPago($notaCredito);
                $montoNC = min((float) $notaCredito->saldo_disponible, $totalEstimado);
                $pagosExtra[] = ['metodo_pago_id' => $metodoPagoNotaCredito->id, 'monto' => $montoNC];
            }

            $stocks = [];
            $variantes = array_values(array_unique(array_column($items, 'variante_id')));
            sort($variantes);
            if ($caja !== null) {
                foreach ($variantes as $varianteId) {
                    $stocks[$varianteId] = $this->movimiento->bloquearStock(new MovimientoInventarioDto($varianteId, (int) $usuario->getAttribute('sucursal_id'), 'salida', 1, 'venta', $usuario->id));
                }
            }

            $venta = $this->ventaService->registrarVentaConBloqueos(
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
                $caja,
                $stocks,
            );

            if (! empty($notaCreditoId)) {
                $montoNC = collect($pagosExtra)->where('metodo_pago_id', $metodoPagoNotaCredito?->id)->first()['monto'] ?? 0;

                if ($montoNC > 0 && $notaCredito !== null) {
                    $this->notaCreditoService->usarEnVentaConNota($notaCredito, $venta->id, $montoNC);
                }
            }

            return $venta;
        });
    }
}
