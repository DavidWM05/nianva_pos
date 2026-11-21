<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\PinSesionDto;

final class DesbloquearSesionRequest extends SolicitudNegocio
{
    /** @return array<string, list<string>> */
    public function rules(): array
    {
        return [
            'pin' => ['required', 'string', 'regex:/\A[0-9]{4,6}\z/'],
        ];
    }

    public function toDto(): PinSesionDto
    {
        return new PinSesionDto((string) $this->validated('pin'));
    }
}
