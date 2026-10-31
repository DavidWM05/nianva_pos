<?php

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\RolDto;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Support\GuardasDeRecurso;
use Illuminate\Validation\Rule;

class GuardarRolRequest extends SolicitudNegocio
{
    public function authorize(): bool
    {
        $rol = $this->route('rol');

        if ($rol instanceof Rol) {
            GuardasDeRecurso::rolSistema($rol, $this->user());
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:80'],
            'descripcion' => ['nullable', 'string'],
            'permisos' => ['nullable', 'array'],
            'permisos.*' => ['integer', Rule::exists('permisos', 'id')],
        ];
    }

    public function toDto(): RolDto
    {
        $v = $this->validated();

        $permisos = array_values(array_map(
            fn (mixed $permiso): int => (int) $permiso,
            (array) ($v['permisos'] ?? []),
        ));

        return new RolDto(
            nombre: (string) $v['nombre'],
            descripcion: isset($v['descripcion']) ? (string) $v['descripcion'] : null,
            permisos: $permisos,
            presentes: array_keys($v),
        );
    }
}
