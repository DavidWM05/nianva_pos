<?php

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\CodigoTwoFactorDto;

class VerifyLoginRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'code' => ['required', 'string'],
        ];
    }

    public function toDto(): CodigoTwoFactorDto
    {
        return new CodigoTwoFactorDto(
            code: (string) $this->validated('code'),
        );
    }
}
