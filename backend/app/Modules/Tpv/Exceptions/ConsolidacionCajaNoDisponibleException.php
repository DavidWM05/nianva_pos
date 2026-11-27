<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

final class ConsolidacionCajaNoDisponibleException extends ExcepcionNegocio
{
    public function __construct(public readonly string $fechaOperativa, public readonly string $motivo)
    {
        parent::__construct($motivo === 'cajas_abiertas'
            ? 'Corta todas las cajas de la fecha operativa antes de consolidar.'
            : 'No hay cortes pendientes de consolidar para la fecha operativa.');
    }

    public function errorCode(): string
    {
        return 'caja_consolidacion_no_disponible';
    }

    /** @return array<string, mixed> */
    public function contexto(): array
    {
        return ['fecha_operativa' => $this->fechaOperativa, 'motivo' => $this->motivo];
    }
}
