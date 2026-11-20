<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class ConteoMetodoFaltanteException extends ExcepcionNegocio
{
    public function __construct(private readonly int $cajaId, private readonly int $metodoId)
    {
        parent::__construct('Falta el conteo de un método de pago con movimientos en la caja.');
    }

    public function errorCode(): string
    {
        return 'conteo_metodo_faltante';
    }

    /** @return array<string, int> */
    public function contexto(): array
    {
        return ['caja_sesion_id' => $this->cajaId, 'metodo_pago_id' => $this->metodoId];
    }
}
