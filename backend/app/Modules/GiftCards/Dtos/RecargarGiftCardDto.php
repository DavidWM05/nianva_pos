<?php

declare(strict_types=1);

namespace App\Modules\GiftCards\Dtos;

use App\Modules\Tpv\Dtos\PagoDto;

final readonly class RecargarGiftCardDto
{
    /** @param list<PagoDto> $pagos */
    public function __construct(
        public float $monto,
        public array $pagos,
    ) {}
}
