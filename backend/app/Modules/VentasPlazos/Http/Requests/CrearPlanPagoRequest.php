<?php

namespace App\Modules\VentasPlazos\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\VentasPlazos\Dtos\CrearPlanPagoDto;

class CrearPlanPagoRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'numero_cuotas' => 'required|integer|min:2|max:36',
            'tasa_interes' => 'nullable|numeric|min:0|max:100',
            'periodicidad' => 'nullable|string|in:semanal,quincenal,mensual',
            'fecha_inicio' => 'nullable|date',
        ];
    }

    public function toDto(): CrearPlanPagoDto
    {
        $v = $this->validated();

        return new CrearPlanPagoDto(
            numeroCuotas: (int) $v['numero_cuotas'],
            tasaInteres: isset($v['tasa_interes']) ? (float) $v['tasa_interes'] : null,
            periodicidad: isset($v['periodicidad']) ? (string) $v['periodicidad'] : null,
            fechaInicio: isset($v['fecha_inicio']) ? (string) $v['fecha_inicio'] : null,
            presentes: array_keys($v),
        );
    }
}
