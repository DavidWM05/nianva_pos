<?php

declare(strict_types=1);

namespace App\Modules\GiftCards\Http\Requests;

use App\Modules\GiftCards\Dtos\RecargarGiftCardDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Tpv\Dtos\PagoDto;

class RecargarGiftCardRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'monto' => ['required', 'numeric', 'decimal:0,2', 'min:0.01', 'max:9999999999.99'],
            'pagos' => ['required', 'array', 'min:1'],
            'pagos.*.metodo_pago_id' => ['required', 'integer', ReglasTenant::existeGlobalODelTenant('metodos_pago', $this->tenantId())],
            'pagos.*.monto' => ['required', 'numeric', 'decimal:0,2', 'min:0.01', 'max:9999999999.99'],
        ];
    }

    public function toDto(): RecargarGiftCardDto
    {
        return new RecargarGiftCardDto(
            monto: (float) $this->validated('monto'),
            pagos: array_values(array_map(static fn (array $pago): PagoDto => new PagoDto((int) $pago['metodo_pago_id'], (float) $pago['monto']), $this->validated('pagos'))),
        );
    }
}
