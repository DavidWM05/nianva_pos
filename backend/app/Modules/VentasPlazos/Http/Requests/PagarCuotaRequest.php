<?php

namespace App\Modules\VentasPlazos\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\UlidPublico;
use App\Modules\VentasPlazos\Dtos\PagarCuotaDto;
use App\Modules\VentasPlazos\Support\ReglasCuota;

class PagarCuotaRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // DAT-08: la cuota llega por su ulid publicado; toDto() la traduce al id.
            'cuota_id' => ['required', 'string', 'ulid', ReglasCuota::delTenantPorUlid($this->tenantId())],
            'monto' => 'nullable|numeric|decimal:0,2|min:0.01',
        ];
    }

    public function toDto(): PagarCuotaDto
    {
        $v = $this->validated();

        return new PagarCuotaDto(
            cuotaId: UlidPublico::idInterno('planes_pago_cliente_cuotas', (string) $v['cuota_id']),
            monto: isset($v['monto']) ? (float) $v['monto'] : null,
            presentes: array_keys($v),
        );
    }
}
