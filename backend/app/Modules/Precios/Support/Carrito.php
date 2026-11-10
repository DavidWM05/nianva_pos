<?php

declare(strict_types=1);

namespace App\Modules\Precios\Support;

final readonly class Carrito
{
    /**
     * @param  list<LineaCarrito>  $lineas
     * @param  ?float  $subtotalReferencia  Solo para validar un cupón sobre el total recibido por la API existente, sin líneas; no sustituye precios de productos.
     */
    public function __construct(public array $lineas, public ?string $codigoCupon = null, public ?float $subtotalReferencia = null)
    {
        if ($subtotalReferencia !== null && $lineas !== []) {
            throw new \InvalidArgumentException('El subtotal de referencia solo admite carritos sin líneas.');
        }
    }
}
