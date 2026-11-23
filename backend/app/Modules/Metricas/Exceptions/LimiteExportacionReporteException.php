<?php

declare(strict_types=1);

namespace App\Modules\Metricas\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

final class LimiteExportacionReporteException extends ExcepcionNegocio
{
    public function __construct(private readonly int $limite)
    {
        parent::__construct('El reporte supera el límite de exportación. Selecciona un rango más corto si el reporte permite filtrar por fecha.');
    }

    public function errorCode(): string
    {
        return 'reporte_exportacion_limite';
    }

    /** @return array{limite: int} */
    public function contexto(): array
    {
        return ['limite' => $this->limite];
    }
}
