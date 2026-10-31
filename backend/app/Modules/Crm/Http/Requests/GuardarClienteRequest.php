<?php

namespace App\Modules\Crm\Http\Requests;

use App\Modules\Crm\Dtos\ClienteDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;

class GuardarClienteRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:200'],
            'documento_fiscal' => ['nullable', 'string', 'max:30'],
            'telefono' => ['nullable', 'string', 'max:20'],
            'correo' => ['nullable', 'email', 'max:150'],
            'direccion' => ['nullable', 'string'],
        ];
    }

    public function toDto(): ClienteDto
    {
        $v = $this->validated();

        return new ClienteDto(
            nombre: (string) $v['nombre'],
            documentoFiscal: isset($v['documento_fiscal']) ? (string) $v['documento_fiscal'] : null,
            telefono: isset($v['telefono']) ? (string) $v['telefono'] : null,
            correo: isset($v['correo']) ? (string) $v['correo'] : null,
            direccion: isset($v['direccion']) ? (string) $v['direccion'] : null,
            presentes: array_keys($v),
        );
    }
}
