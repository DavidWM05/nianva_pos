<?php

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\ResetPasswordDto;
use Illuminate\Validation\Rules\Password as PasswordRule;

class ResetPasswordRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'correo' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ];
    }

    public function toDto(): ResetPasswordDto
    {
        $v = $this->validated();

        return new ResetPasswordDto(
            correo: (string) $v['correo'],
            token: (string) $v['token'],
            password: (string) $v['password'],
        );
    }
}
