<?php

namespace App\Modules\Prestamos\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Prestamos\Dtos\CrearPrestamoDto;

class CrearPrestamoRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'proveedor_id' => ['nullable', 'integer', ReglasTenant::existe('proveedores', $this->tenantId())],
            'referencia' => 'nullable|string|max:100',
            'monto' => 'required|numeric|min:0.01',
            'interes' => 'nullable|numeric|min:0|max:100',
            'fecha_prestamo' => 'required|date',
            'fecha_vencimiento' => 'nullable|date|after_or_equal:fecha_prestamo',
            'notas' => 'nullable|string|max:1000',
        ];
    }

    public function toDto(): CrearPrestamoDto
    {
        $v = $this->validated();

        return new CrearPrestamoDto(
            proveedorId: isset($v['proveedor_id']) ? (int) $v['proveedor_id'] : null,
            referencia: isset($v['referencia']) ? (string) $v['referencia'] : null,
            monto: (float) $v['monto'],
            interes: isset($v['interes']) ? (float) $v['interes'] : null,
            fechaPrestamo: (string) $v['fecha_prestamo'],
            fechaVencimiento: isset($v['fecha_vencimiento']) ? (string) $v['fecha_vencimiento'] : null,
            notas: isset($v['notas']) ? (string) $v['notas'] : null,
        );
    }
}
