<?php

namespace App\Modules\Precios\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Precios\Dtos\CuponDto;
use App\Modules\Precios\Models\Cupon;
use Illuminate\Validation\Rule;

class GuardarCuponRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $cupon = $this->route('cupon');
        $cuponId = $cupon instanceof Cupon ? $cupon->id : null;

        return [
            'codigo' => [
                'required', 'string', 'max:50',
                Rule::unique('cupones', 'codigo')->where('tenant_id', $this->tenantId())->ignore($cuponId),
            ],
            'nombre' => ['required', 'string', 'max:120'],
            'tipo' => ['required', Rule::in(['porcentaje', 'monto_fijo'])],
            'valor' => ['required', 'numeric', 'min:0'],
            'uso_maximo' => ['nullable', 'integer', 'min:1'],
            'uso_maximo_por_cliente' => ['nullable', 'integer', 'min:1'],
            'fecha_inicio' => ['nullable', 'date'],
            'fecha_fin' => ['nullable', 'date', 'after_or_equal:fecha_inicio'],
        ];
    }

    public function toDto(): CuponDto
    {
        $v = $this->validated();

        return new CuponDto(
            codigo: (string) $v['codigo'],
            nombre: (string) $v['nombre'],
            tipo: (string) $v['tipo'],
            valor: (float) $v['valor'],
            usoMaximo: isset($v['uso_maximo']) ? (int) $v['uso_maximo'] : null,
            usoMaximoPorCliente: isset($v['uso_maximo_por_cliente']) ? (int) $v['uso_maximo_por_cliente'] : null,
            fechaInicio: isset($v['fecha_inicio']) ? (string) $v['fecha_inicio'] : null,
            fechaFin: isset($v['fecha_fin']) ? (string) $v['fecha_fin'] : null,
            presentes: array_keys($v),
        );
    }
}
