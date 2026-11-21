<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\AutorizarSupervisorDto;
use App\Modules\Nucleo\Support\AccionSupervisor;
use App\Modules\Nucleo\Support\HuellaSupervisor;
use Illuminate\Validation\Rule;

final class AutorizarSupervisorRequest extends SolicitudNegocio
{
    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'supervisor_id' => ['required', 'integer', 'min:1'],
            'pin' => ['required', 'string', 'regex:/^[0-9]{4,6}$/D'],
            'accion' => ['required', Rule::enum(AccionSupervisor::class)],
            'recurso' => ['nullable', 'required_unless:accion,ventas.descuento', 'prohibited_if:accion,ventas.descuento', 'ulid'],
            /** Cuerpo exacto de la operación a autorizar.
             * @var array<string, mixed>
             */
            'datos' => ['present', 'array'],
        ];
    }

    public function toDto(): AutorizarSupervisorDto
    {
        $recurso = $this->validated('recurso');

        return new AutorizarSupervisorDto(
            (int) $this->validated('supervisor_id'),
            (string) $this->validated('pin'),
            AccionSupervisor::from((string) $this->validated('accion')),
            is_string($recurso) ? strtolower($recurso) : null,
            HuellaSupervisor::de($this->validated('datos')),
        );
    }
}
