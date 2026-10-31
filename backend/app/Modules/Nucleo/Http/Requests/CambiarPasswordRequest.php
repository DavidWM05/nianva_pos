<?php

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\CambiarPasswordDto;
use Illuminate\Validation\Rules\Password as PasswordRule;

class CambiarPasswordRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'password_actual' => ['required', 'string'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ];
    }

    public function toDto(): CambiarPasswordDto
    {
        $v = $this->validated();

        return new CambiarPasswordDto(
            passwordActual: (string) $v['password_actual'],
            password: (string) $v['password'],
        );
    }
}
