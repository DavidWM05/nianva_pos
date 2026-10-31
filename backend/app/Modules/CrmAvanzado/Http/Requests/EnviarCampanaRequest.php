<?php

namespace App\Modules\CrmAvanzado\Http\Requests;

use App\Modules\CrmAvanzado\Dtos\EnviarCampanaDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;

class EnviarCampanaRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'segmento' => ['nullable', 'string', 'in:todos,nuevo,frecuente,vip,inactivo'],
            'cliente_ids' => ['nullable', 'array'],
            'cliente_ids.*' => ['integer', ReglasTenant::existe('clientes', $this->tenantId())],
            'asunto' => ['required', 'string', 'max:200'],
            'mensaje' => ['required', 'string', 'max:5000'],
        ];
    }

    public function toDto(): EnviarCampanaDto
    {
        $v = $this->validated();

        $clienteIds = null;
        if (isset($v['cliente_ids'])) {
            $clienteIds = array_values(array_map(
                fn (mixed $clienteId): int => (int) $clienteId,
                (array) $v['cliente_ids'],
            ));
        }

        return new EnviarCampanaDto(
            segmento: isset($v['segmento']) ? (string) $v['segmento'] : null,
            clienteIds: $clienteIds,
            asunto: (string) $v['asunto'],
            mensaje: (string) $v['mensaje'],
        );
    }
}
