<?php

declare(strict_types=1);

namespace App\Aplicacion\Reportes;

use App\Modules\CrmAvanzado\Metricas\ReporteCrm;
use App\Modules\Nucleo\Dtos\ConsultarReporteTenantDto;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Auth\Access\AuthorizationException;

final readonly class ObtenerReporteCrm
{
    public function __construct(private TenantContext $tenant, private ReporteCrm $reporte) {}

    /** @return array{data: array<string, mixed>, meta: array{page: int, rows: int, total: int, filtros_aplicados: object, permisos: array{exportar: bool}}} */
    public function ejecutar(ConsultarReporteTenantDto $filtros): array
    {
        $tenantId = $this->tenant->id() ?? throw new AuthorizationException;

        return $this->reporte->consultar($tenantId, $filtros);
    }
}
