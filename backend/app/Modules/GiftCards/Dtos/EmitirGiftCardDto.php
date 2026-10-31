<?php

namespace App\Modules\GiftCards\Dtos;

final readonly class EmitirGiftCardDto
{
    public function __construct(
        public ?int $clienteId,
        public float $monto,
        public ?string $fechaExpiracion,
    ) {}
}
