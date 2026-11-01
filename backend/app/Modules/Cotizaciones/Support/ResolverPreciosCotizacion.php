<?php

namespace App\Modules\Cotizaciones\Support;

use App\Modules\Cotizaciones\Dtos\LineaCotizacionDto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Precios\Services\PrecioService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;

/**
 * Resuelve el precio y el descuento de cada linea de una cotizacion.
 *
 * El precio normal sale de PrecioService (la misma autoridad que usa una
 * venta). El precio/descuento que manda el cliente solo se respeta cuando
 * tiene cotizaciones.precio_manual; si no, se ignora aunque venga.
 */
final class ResolverPreciosCotizacion
{
    public function __construct(private readonly PrecioService $precioService) {}

    /**
     * @param  array<int|string, mixed>  $items
     * @return list<LineaCotizacionDto>
     */
    public function resolver(array $items, bool $precioManual): array
    {
        $lineas = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                throw ValidationException::withMessages([
                    'items' => ['Cada linea debe ser un objeto valido.'],
                ]);
            }

            try {
                $variante = ProductoVariante::sinTenant()
                    ->with('producto')
                    ->findOrFail((int) $item['variante_id']);

                if (! $variante instanceof ProductoVariante) {
                    throw new ModelNotFoundException;
                }
            } catch (ModelNotFoundException) {
                throw ValidationException::withMessages([
                    'items' => ['La variante seleccionada no existe.'],
                ]);
            }

            $cantidad = (int) $item['cantidad'];
            $sugerido = $this->precioService->calcularDescuento($variante, $cantidad);

            $precio = $precioManual && isset($item['precio_unitario'])
                ? round((float) $item['precio_unitario'], 2)
                : $sugerido->precioUnitario;

            $descuento = $precioManual && isset($item['descuento'])
                ? round((float) $item['descuento'], 2)
                : $sugerido->descuentoTotal;

            $lineas[] = new LineaCotizacionDto(
                varianteId: $variante->id,
                cantidad: $cantidad,
                precioUnitario: $precio,
                descuento: $descuento,
            );
        }

        return $lineas;
    }
}
