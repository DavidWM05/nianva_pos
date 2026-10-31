<?php

namespace App\Modules\GiftCards\Dtos;

final readonly class RecargarGiftCardDto
{
    public function __construct(
        public float $monto,
    ) {}
}
