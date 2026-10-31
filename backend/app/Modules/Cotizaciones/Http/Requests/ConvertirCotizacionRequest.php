<?php

namespace App\Modules\Cotizaciones\Http\Requests;

use App\Modules\Cotizaciones\Dtos\ConvertirCotizacionDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;

class ConvertirCotizacionRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'metodo_pago_id' => [
                'required', 'integer',
                ReglasTenant::existeGlobalODelTenant('metodos_pago', $this->tenantId()),
            ],
        ];
    }

    public function toDto(): ConvertirCotizacionDto
    {
        return new ConvertirCotizacionDto(
            metodoPagoId: (int) $this->validated('metodo_pago_id'),
        );
    }
}
