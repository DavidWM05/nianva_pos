<?php

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\SendResetLinkDto;

class SendResetLinkRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'correo' => ['required', 'email'],
        ];
    }

    public function toDto(): SendResetLinkDto
    {
        return new SendResetLinkDto(
            correo: (string) $this->validated('correo'),
        );
    }
}
