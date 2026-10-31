<?php

namespace App\Modules\GiftCards\Http\Requests;

use App\Modules\GiftCards\Dtos\EmitirGiftCardDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;

class EmitirGiftCardRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'cliente_id' => ['nullable', 'integer', ReglasTenant::existe('clientes', $this->tenantId())],
            'monto' => ['required', 'numeric', 'min:0.01'],
            'fecha_expiracion' => ['nullable', 'date', 'after:today'],
        ];
    }

    public function toDto(): EmitirGiftCardDto
    {
        $v = $this->validated();

        return new EmitirGiftCardDto(
            clienteId: isset($v['cliente_id']) ? (int) $v['cliente_id'] : null,
            monto: (float) $v['monto'],
            fechaExpiracion: isset($v['fecha_expiracion']) ? (string) $v['fecha_expiracion'] : null,
        );
    }
}
