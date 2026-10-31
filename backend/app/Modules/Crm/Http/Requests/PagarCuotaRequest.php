<?php

namespace App\Modules\Crm\Http\Requests;

use App\Modules\Crm\Dtos\PagarCuotaDto;
use App\Modules\Crm\Support\ReglasCuota;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;

class PagarCuotaRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'cuota_id' => ['required', 'integer', ReglasCuota::delTenant($this->tenantId())],
            'monto' => 'nullable|numeric|min:0.01',
        ];
    }

    public function toDto(): PagarCuotaDto
    {
        $v = $this->validated();

        return new PagarCuotaDto(
            cuotaId: (int) $v['cuota_id'],
            monto: isset($v['monto']) ? (float) $v['monto'] : null,
            presentes: array_keys($v),
        );
    }
}
