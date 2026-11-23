<?php

declare(strict_types=1);

namespace App\Aplicacion\Reportes;

use App\Modules\CuentasCobrar\Metricas\ReporteCuentasCobrar;
use App\Modules\Metricas\Services\CrearContextoMetricas;
use App\Modules\Nucleo\Dtos\ConsultarReporteTenantDto;

final readonly class ObtenerReporteCuentasCobrar
{
    public function __construct(private CrearContextoMetricas $contextos, private ReporteCuentasCobrar $reporte) {}

    /** @return array{data: array<string, mixed>, meta: array{page: int, rows: int, total: int, filtros_aplicados: object, permisos: array{exportar: bool}}} */
    public function ejecutar(ConsultarReporteTenantDto $filtros): array
    {
        return $this->reporte->consultar($this->contextos->paraReporte(null), $filtros);
    }
}
