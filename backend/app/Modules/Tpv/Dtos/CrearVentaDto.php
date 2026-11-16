<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Dtos;

final readonly class CrearVentaDto
{
    /**
     * @param  list<LineaVentaDto>  $items
     * @param  list<PagoDto>  $pagos
     */
    public function __construct(
        public int $clienteId,
        public array $items,
        public array $pagos,
        public ?string $cuponCodigo,
        public float $descuentoManual,
        public ?string $giftCardCodigo,
        public ?int $notaCreditoId,
        public ?int $listaPrecioId = null,
    ) {}
}
