<?php

declare(strict_types=1);

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
        public ?int $listaPrecioId = null,
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

        if (in_array('lista_precio_id', $this->presentes, true)) {
            $datos['lista_precio_id'] = $this->listaPrecioId;
        }

        return $datos;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function itemsParaServicio(): array
    {
        return array_map(fn (LineaCotizacionDto $item) => $item->paraServicio(), $this->items);
    }
}
