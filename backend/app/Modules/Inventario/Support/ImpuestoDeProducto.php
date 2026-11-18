<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Support;

use App\Modules\Inventario\Models\Producto;
use App\Modules\Nucleo\Support\DecimalApi;

/**
 * Decisión 9: la tasa de IVA va por producto, con la tasa por defecto del tenant si el producto no
 * tiene. Un solo lugar para resolverla: lo usan PricingService (venta, apartado, cotización) y la
 * compra, que no pasa por PricingService.
 */
final class ImpuestoDeProducto
{
    /**
     * @param  mixed  $tasaDefault  `configuracion_tenant.tasa_iva_default` del tenant del producto.
     * @return array{0: string, 1: bool} la tasa en D4 y si el producto está exento.
     */
    public static function de(Producto $producto, mixed $tasaDefault): array
    {
        return [
            DecimalApi::tasa($producto->getAttribute('tasa_iva') ?? $tasaDefault),
            (bool) $producto->getAttribute('exento_iva'),
        ];
    }
}
