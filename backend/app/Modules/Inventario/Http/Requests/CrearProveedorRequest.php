<?php

namespace App\Modules\Inventario\Http\Requests;

use App\Modules\Inventario\Dtos\ProveedorDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;

class CrearProveedorRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'razon_social' => ['required', 'string', 'max:200'],
            'rfc' => ['nullable', 'string', 'max:20'],
            'telefono' => ['nullable', 'string', 'max:20'],
            'correo' => ['nullable', 'email', 'max:150'],
            'direccion' => ['nullable', 'string'],
        ];
    }

    public function toDto(): ProveedorDto
    {
        $v = $this->validated();

        return new ProveedorDto(
            razonSocial: (string) $v['razon_social'],
            rfc: isset($v['rfc']) ? (string) $v['rfc'] : null,
            telefono: isset($v['telefono']) ? (string) $v['telefono'] : null,
            correo: isset($v['correo']) ? (string) $v['correo'] : null,
            direccion: isset($v['direccion']) ? (string) $v['direccion'] : null,
        );
    }
}
