<?php

declare(strict_types=1);

namespace App\Modules\Precios\Support;

/**
 * DAT-03: la parte de precio de la foto de una línea, tal como la cotizó PricingService: precio,
 * descuento, lista, regla principal, reglas combinadas, tasa, exento, impuesto y factor. El costo
 * y la unidad los agrega quien escribe la línea (stock bloqueado y UnidadDeVariante).
 *
 * La regla principal es la primera aplicada (la de mayor prioridad). Las reglas combinadas solo
 * se listan cuando hay más de una.
 */
final class FotoDePrecio
{
    /**
     * @return array{precio_unitario: float, descuento: float, lista_precio_id: int|null, lista_precio_nombre: string|null, regla_precio_id: int|null, regla_nombre: string|null, reglas: list<array{regla_precio_id: int, regla_nombre: string, descuento: float}>, tasa_impuesto: string, exento: bool, impuesto: float, factor: string}
     */
    public static function de(LineaPrecio $linea): array
    {
        $principal = $linea->reglas[0] ?? null;

        return [
            'precio_unitario' => $linea->precioBase,
            'descuento' => $linea->descuento,
            'lista_precio_id' => $linea->listaAplicada,
            'lista_precio_nombre' => $linea->listaAplicada === null ? null : $linea->listaNombre(),
            'regla_precio_id' => $principal?->id,
            'regla_nombre' => $principal?->nombre(),
            'reglas' => count($linea->reglas) > 1
                ? array_map(static fn (ReglaAplicada $regla): array => ['regla_precio_id' => $regla->id, 'regla_nombre' => $regla->nombre(), 'descuento' => $regla->descuento], $linea->reglas)
                : [],
            'tasa_impuesto' => $linea->tasaImpuesto,
            'exento' => $linea->exento,
            'impuesto' => $linea->impuesto,
            'factor' => $linea->factor,
        ];
    }
}
