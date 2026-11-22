<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\ListarSupervisoresDto;
use App\Modules\Nucleo\Support\AccionSupervisor;
use Illuminate\Validation\Rule;

final class ListarSupervisoresRequest extends SolicitudNegocio
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'accion' => ['required', Rule::enum(AccionSupervisor::class)],
            'recurso' => ['nullable', 'required_unless:accion,ventas.descuento', 'prohibited_if:accion,ventas.descuento', 'ulid'],
        ];
    }

    public function toDto(): ListarSupervisoresDto
    {
        $recurso = $this->validated('recurso');

        return new ListarSupervisoresDto(
            AccionSupervisor::from((string) $this->validated('accion')),
            is_string($recurso) ? strtolower($recurso) : null,
        );
    }
}
