<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Tpv\Dtos\FechaConsolidadoCajaDto;

final class FechaConsolidadoCajaRequest extends SolicitudNegocio
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return ['fecha_operativa' => ['required', 'date_format:Y-m-d']];
    }

    public function toDto(): FechaConsolidadoCajaDto
    {
        return new FechaConsolidadoCajaDto((string) $this->validated('fecha_operativa'));
    }
}
