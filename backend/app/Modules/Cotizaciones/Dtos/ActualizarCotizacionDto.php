<?php

namespace App\Modules\Cotizaciones\Dtos;

final readonly class ActualizarCotizacionDto
{
    /**
     * @param  list<LineaCotizacionDto>  $items
     * @param  list<string>  $presentes
     */
    public function __construct(
        public ?int $clienteId,
        public ?int $validezDias,
        public ?float $descuento,
        public ?string $usoCfdi,
        public ?string $observaciones,
        public array $items,
        private array $presentes,
    ) {}

    /**
     * @return list<string>
     */
    public function camposPresentes(): array
    {
        return $this->presentes;
    }

    /**
     * @return array<string, mixed>
     */
    public function datosPresentes(): array
    {
        $datos = [];

        if (in_array('cliente_id', $this->presentes, true)) {
            $datos['cliente_id'] = $this->clienteId;
        }
        if (in_array('validez_dias', $this->presentes, true)) {
            $datos['validez_dias'] = $this->validezDias;
        }
        if (in_array('descuento', $this->presentes, true)) {
            $datos['descuento'] = $this->descuento;
        }
        if (in_array('uso_cfdi', $this->presentes, true)) {
            $datos['uso_cfdi'] = $this->usoCfdi;
        }
        if (in_array('observaciones', $this->presentes, true)) {
            $datos['observaciones'] = $this->observaciones;
        }

        return $datos;
    }

    /**
     * @return list<array{variante_id:int, cantidad:int, precio_unitario:float, descuento:float}>
     */
    public function itemsParaServicio(): array
    {
        return array_map(
            fn (LineaCotizacionDto $item) => [
                'variante_id' => $item->varianteId,
                'cantidad' => $item->cantidad,
                'precio_unitario' => $item->precioUnitario,
                'descuento' => $item->descuento,
            ],
            $this->items,
        );
    }
}
