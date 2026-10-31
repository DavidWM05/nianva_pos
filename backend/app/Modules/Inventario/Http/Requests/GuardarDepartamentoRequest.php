<?php

namespace App\Modules\Inventario\Http\Requests;

use App\Modules\Inventario\Dtos\DepartamentoDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;

class GuardarDepartamentoRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:120'],
            'descripcion' => ['nullable', 'string'],
        ];
    }

    public function toDto(): DepartamentoDto
    {
        $v = $this->validated();

        return new DepartamentoDto(
            nombre: (string) $v['nombre'],
            descripcion: isset($v['descripcion']) ? (string) $v['descripcion'] : null,
            presentes: array_keys($v),
        );
    }
}
