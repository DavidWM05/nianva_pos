<?php

namespace App\Modules\CuentasCobrar\Http\Requests;

use App\Modules\CuentasCobrar\Dtos\RegistrarAbonoDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;

class RegistrarAbonoRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'monto' => ['required', 'numeric', 'min:0.01'],
            'metodo_pago_id' => ['required', 'integer', ReglasTenant::existeGlobalODelTenant('metodos_pago', $this->tenantId())],
            'referencia' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function toDto(): RegistrarAbonoDto
    {
        $v = $this->validated();

        return new RegistrarAbonoDto(
            monto: (float) $v['monto'],
            metodoPagoId: (int) $v['metodo_pago_id'],
            referencia: isset($v['referencia']) ? (string) $v['referencia'] : null,
        );
    }
}
