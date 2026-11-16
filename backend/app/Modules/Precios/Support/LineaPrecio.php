<?php

declare(strict_types=1);

namespace App\Modules\Precios\Support;

final readonly class LineaPrecio
{
    /**
     * @param  list<ReglaAplicada>  $reglas
     * @param  int|null  $listaAplicada  Lista cuyo item fijó el precio; null si no hubo item aplicable.
     * @param  float  $impuesto  IVA incluido, después de descuentos y reparto del cupón.
     */
    public function __construct(
        public int $varianteId,
        public int|float $cantidad,
        public float $precioBase,
        public ?int $listaAplicada,
        public array $reglas,
        public float $descuento,
        public float $impuesto,
        public float $total,
        public string $tasaImpuesto = '0.0000',
        public bool $exento = false,
    ) {}
}
