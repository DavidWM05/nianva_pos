<?php

namespace App\Modules\UnidadesMedida\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\UnidadesMedida\Dtos\UnidadMedidaDto;

class GuardarUnidadMedidaRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        if ($this->route('id') !== null) {
            return [
                'nombre' => ['sometimes', 'string', 'max:50'],
                'abreviatura' => ['sometimes', 'string', 'max:10'],
                'tipo' => ['sometimes', 'string', 'in:entero,fraccionario'],
                'activo' => ['sometimes', 'boolean'],
            ];
        }

        return [
            'nombre' => ['required', 'string', 'max:50'],
            'abreviatura' => ['required', 'string', 'max:10'],
            'tipo' => ['required', 'string', 'in:entero,fraccionario'],
        ];
    }

    public function toDto(): UnidadMedidaDto
    {
        $v = $this->validated();

        return new UnidadMedidaDto(
            nombre: isset($v['nombre']) ? (string) $v['nombre'] : null,
            abreviatura: isset($v['abreviatura']) ? (string) $v['abreviatura'] : null,
            tipo: isset($v['tipo']) ? (string) $v['tipo'] : null,
            activo: isset($v['activo']) ? (bool) $v['activo'] : null,
            presentes: array_keys($v),
        );
    }
}
