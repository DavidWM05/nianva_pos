<?php

namespace App\Modules\Payroll\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Nucleo\Support\SucursalOperacion;
use App\Modules\Payroll\Dtos\GenerarNominaDto;

class GenerarNominaRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'sucursal_id' => ['nullable', 'integer', ReglasTenant::existe('sucursales', $this->tenantId())],
            'periodo_inicio' => 'required|date',
            'periodo_fin' => 'required|date|after_or_equal:periodo_inicio',
        ];
    }

    public function toDto(): GenerarNominaDto
    {
        $v = $this->validated();
        $usuario = $this->user();

        if ($usuario === null) {
            abort(401);
        }

        return new GenerarNominaDto(
            sucursalId: SucursalOperacion::paraEscritura(
                $usuario,
                isset($v['sucursal_id']) ? (int) $v['sucursal_id'] : null,
            ),
            periodoInicio: (string) $v['periodo_inicio'],
            periodoFin: (string) $v['periodo_fin'],
        );
    }
}
