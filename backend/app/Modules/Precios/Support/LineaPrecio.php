<?php

declare(strict_types=1);

namespace App\Modules\Precios\Support;

final readonly class LineaPrecio
{
    /**
     * @param  list<ReglaAplicada>  $reglas
     * @param  int|null  $listaAplicada  Lista cuyo item fijó el precio; null si no hubo item aplicable.
     * @param  string|null  $listaNombre  Nombre de esa lista, para la foto de la línea (DAT-03); null junto con $listaAplicada.
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
        public ?int $presentacionId = null,
        public ?string $presentacionNombre = null,
        public string $factor = '1.000',
        private ?string $listaNombre = null,
    ) {}

    /** Nombre de la lista aplicada, para la foto; privado para no cambiar la forma pública del cálculo. */
    public function listaNombre(): ?string
    {
        return $this->listaNombre;
    }
}
