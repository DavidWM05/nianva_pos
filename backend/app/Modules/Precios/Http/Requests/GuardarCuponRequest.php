<?php

namespace App\Modules\Precios\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Precios\Dtos\CuponDto;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Support\ReglasPorcentajeMonto;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

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
            'porcentaje' => ReglasPorcentajeMonto::porcentaje(),
            'monto' => ReglasPorcentajeMonto::monto(),
            'uso_maximo' => ['nullable', 'integer', 'min:1'],
            'uso_maximo_por_cliente' => ['nullable', 'integer', 'min:1'],
            'fecha_inicio' => ['nullable', 'date'],
            'fecha_fin' => ['nullable', 'date', 'after_or_equal:fecha_inicio'],
        ];
    }

    public function toDto(): CuponDto
    {
        $v = $this->validated();
        $tipo = (string) $v['tipo'];
        $porcentaje = $v['porcentaje'] ?? null;
        $monto = $v['monto'] ?? null;

        $errores = ReglasPorcentajeMonto::errores($tipo, $porcentaje, $monto, 'cupones');
        if ($errores !== []) {
            throw ValidationException::withMessages($errores);
        }

        // `tipo` siempre llega, tambien en la edicion: el campo que no le toca se guarda null.
        return new CuponDto(
            codigo: (string) $v['codigo'],
            nombre: (string) $v['nombre'],
            tipo: $tipo,
            porcentaje: ReglasPorcentajeMonto::porcentajeDelTipo($tipo, $porcentaje),
            monto: ReglasPorcentajeMonto::montoDelTipo($tipo, $monto),
            usoMaximo: isset($v['uso_maximo']) ? (int) $v['uso_maximo'] : null,
            usoMaximoPorCliente: isset($v['uso_maximo_por_cliente']) ? (int) $v['uso_maximo_por_cliente'] : null,
            fechaInicio: isset($v['fecha_inicio']) ? (string) $v['fecha_inicio'] : null,
            fechaFin: isset($v['fecha_fin']) ? (string) $v['fecha_fin'] : null,
            presentes: array_values(array_unique([...array_keys($v), 'porcentaje', 'monto'])),
        );
    }
}
