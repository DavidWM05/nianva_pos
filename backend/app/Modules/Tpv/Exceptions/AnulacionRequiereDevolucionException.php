<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

final class AnulacionRequiereDevolucionException extends ExcepcionNegocio
{
    public function __construct(public readonly int $cajaSesionId)
    {
        parent::__construct('La caja de esta venta ya está cerrada. Registra una devolución.');
    }

    public function errorCode(): string
    {
        return 'anulacion_requiere_devolucion';
    }

    public function status(): int
    {
        return 422;
    }

    /** @return array<string, mixed> */
    public function contexto(): array
    {
        return ['caja_sesion_id' => $this->cajaSesionId];
    }
}
