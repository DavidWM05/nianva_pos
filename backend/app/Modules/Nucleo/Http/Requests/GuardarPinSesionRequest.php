<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\PinSesionDto;

final class GuardarPinSesionRequest extends SolicitudNegocio
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'pin' => ['required', 'string', 'regex:/\A[0-9]{4,6}\z/'],
            'password_actual' => ['required', 'string'],
        ];
    }

    public function toDto(): PinSesionDto
    {
        return new PinSesionDto((string) $this->validated('pin'), (string) $this->validated('password_actual'));
    }
}
