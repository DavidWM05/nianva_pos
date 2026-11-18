<?php

namespace App\Modules\Cotizaciones\Dtos;

final readonly class LineaCotizacionDto
{
    /**
     * DAT-03: con precio sugerido, la lista y las reglas que aplicó PricingService; con precio o
     * descuento manual, sin regla y con la lista del contexto si aplicó. Null y [] cuando no
     * aplicaron.
     *
     * @param  list<array{regla_precio_id: int, regla_nombre: string, descuento: float}>  $reglas
     */
    public function __construct(
        public int $varianteId,
        public int|float $cantidad,
        public float $precioUnitario,
        public float $descuento,
        public ?int $listaPrecioId = null,
        public ?string $listaPrecioNombre = null,
        public ?int $reglaPrecioId = null,
        public ?string $reglaNombre = null,
        public array $reglas = [],
    ) {}

    /**
     * @return array{variante_id: int, cantidad: int|float, precio_unitario: float, descuento: float, lista_precio_id: int|null, lista_precio_nombre: string|null, regla_precio_id: int|null, regla_nombre: string|null, reglas: list<array{regla_precio_id: int, regla_nombre: string, descuento: float}>}
     */
    public function paraServicio(): array
    {
        return [
            'variante_id' => $this->varianteId,
            'cantidad' => $this->cantidad,
            'precio_unitario' => $this->precioUnitario,
            'descuento' => $this->descuento,
            'lista_precio_id' => $this->listaPrecioId,
            'lista_precio_nombre' => $this->listaPrecioNombre,
            'regla_precio_id' => $this->reglaPrecioId,
            'regla_nombre' => $this->reglaNombre,
            'reglas' => $this->reglas,
        ];
    }
}
