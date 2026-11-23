<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\ConsultarReporteTenantDto;

final class ConsultarReporteTenantRequest extends SolicitudNegocio
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'rows' => ['sometimes', 'integer', 'between:1,100'],
            'limite' => ['sometimes', 'integer'],
        ];
    }

    public function toDto(): ConsultarReporteTenantDto
    {
        $filtros = $this->validated();

        return new ConsultarReporteTenantDto(
            (int) ($filtros['page'] ?? 1),
            (int) ($filtros['rows'] ?? 25),
            max(1, min(50, (int) ($filtros['limite'] ?? 10))),
        );
    }
}
