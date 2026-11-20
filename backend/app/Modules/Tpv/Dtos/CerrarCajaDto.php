<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Dtos;

final readonly class CerrarCajaDto
{
    /** @param list<array{metodo_pago_id:int,monto:int|float|string}> $conteos */
    public function __construct(
        public array $conteos,
    ) {}
}
