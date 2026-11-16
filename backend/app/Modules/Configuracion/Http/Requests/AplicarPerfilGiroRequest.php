<?php

declare(strict_types=1);

namespace App\Modules\Configuracion\Http\Requests;

use App\Modules\Configuracion\Dtos\AplicarPerfilGiroDto;
use App\Modules\Configuracion\Support\PerfilesGiro;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use Illuminate\Validation\Rule;

class AplicarPerfilGiroRequest extends SolicitudNegocio
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'perfil' => ['required', 'string', Rule::in(PerfilesGiro::claves())],
        ];
    }

    public function toDto(): AplicarPerfilGiroDto
    {
        return new AplicarPerfilGiroDto(perfil: (string) $this->validated()['perfil']);
    }
}
