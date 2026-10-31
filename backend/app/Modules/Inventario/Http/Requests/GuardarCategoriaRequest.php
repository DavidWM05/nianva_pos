<?php

namespace App\Modules\Inventario\Http\Requests;

use App\Modules\Inventario\Dtos\CategoriaDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;

class GuardarCategoriaRequest extends SolicitudNegocio
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

    public function toDto(): CategoriaDto
    {
        $v = $this->validated();

        return new CategoriaDto(
            nombre: (string) $v['nombre'],
            descripcion: isset($v['descripcion']) ? (string) $v['descripcion'] : null,
            presentes: array_keys($v),
        );
    }
}
