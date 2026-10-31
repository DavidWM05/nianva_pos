<?php

namespace App\Modules\Payroll\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Payroll\Dtos\EmpleadoDto;

class CrearEmpleadoRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = $this->tenantId();

        return [
            'usuario_id' => ['required', 'integer', ReglasTenant::existe('usuarios', $tenantId)],
            'sucursal_id' => ['required', 'integer', ReglasTenant::existe('sucursales', $tenantId)],
            'salario_base' => 'nullable|numeric|min:0',
            'tipo_salario' => 'nullable|string|in:fijo,por_hora',
            'fecha_ingreso' => 'nullable|date',
            'numero_seguridad_social' => 'nullable|string|max:30',
        ];
    }

    public function toDto(): EmpleadoDto
    {
        $v = $this->validated();

        return new EmpleadoDto(
            usuarioId: (int) $v['usuario_id'],
            sucursalId: (int) $v['sucursal_id'],
            salarioBase: isset($v['salario_base']) ? (float) $v['salario_base'] : null,
            tipoSalario: isset($v['tipo_salario']) ? (string) $v['tipo_salario'] : null,
            fechaIngreso: isset($v['fecha_ingreso']) ? (string) $v['fecha_ingreso'] : null,
            numeroSeguridadSocial: isset($v['numero_seguridad_social']) ? (string) $v['numero_seguridad_social'] : null,
        );
    }
}
