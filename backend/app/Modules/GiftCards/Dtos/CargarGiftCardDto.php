<?php

declare(strict_types=1);

namespace App\Modules\GiftCards\Dtos;

final readonly class CargarGiftCardDto
{
    public function __construct(public int $giftCardId, public float $monto) {}
}
