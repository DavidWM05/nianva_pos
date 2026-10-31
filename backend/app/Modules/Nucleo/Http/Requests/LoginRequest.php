<?php

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\LoginDto;

class LoginRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'correo' => ['required', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    public function toDto(): LoginDto
    {
        $v = $this->validated();

        return new LoginDto(
            correo: (string) $v['correo'],
            password: (string) $v['password'],
        );
    }
}
