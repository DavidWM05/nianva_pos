<?php

namespace App\Modules\Apartados\Http\Requests;

use App\Modules\Apartados\Dtos\PagoApartadoDto;
use App\Modules\Apartados\Dtos\RegistrarAbonoApartadoDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;

class RegistrarAbonoRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = $this->tenantId();

        return [
            'monto' => ['required', 'numeric', 'min:0.01'],
            'pagos' => ['required', 'array', 'min:1'],
            'pagos.*.metodo_pago_id' => ['required', 'integer', ReglasTenant::existeGlobalODelTenant('metodos_pago', $tenantId)],
            'pagos.*.monto' => ['required', 'numeric', 'min:0.01'],
            'notas' => ['nullable', 'string'],
        ];
    }

    public function toDto(): RegistrarAbonoApartadoDto
    {
        $v = $this->validated();

        $pagos = array_values(array_map(
            function (mixed $pago): PagoApartadoDto {
                $pago = (array) $pago;

                return new PagoApartadoDto(
                    metodoPagoId: (int) $pago['metodo_pago_id'],
                    monto: (float) $pago['monto'],
                );
            },
            (array) ($v['pagos'] ?? []),
        ));

        return new RegistrarAbonoApartadoDto(
            monto: (float) $v['monto'],
            pagos: $pagos,
            notas: isset($v['notas']) ? (string) $v['notas'] : null,
        );
    }
}
