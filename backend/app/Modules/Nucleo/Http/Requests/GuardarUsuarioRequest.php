<?php

namespace App\Modules\Nucleo\Http\Requests;

use App\Modules\Nucleo\Dtos\UsuarioDto;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\ReglasTenant;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;

class GuardarUsuarioRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $usuario = $this->route('usuario');
        $usuarioId = $usuario instanceof Usuario ? $usuario->id : null;
        $tenantId = $this->tenantId();

        return [
            'nombre' => ['required', 'string', 'max:150'],
            'apellido' => ['nullable', 'string', 'max:150'],
            'alias' => ['nullable', 'string', 'max:50'],
            'correo' => [
                'required', 'email', 'max:150',
                Rule::unique('usuarios', 'correo')->ignore($usuarioId),
            ],
            'password' => [$usuarioId === null ? 'required' : 'nullable', PasswordRule::min(8)],
            'telefono' => ['nullable', 'string', 'max:20'],
            'sucursal_id' => ['nullable', 'integer', ReglasTenant::existe('sucursales', $tenantId)],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['integer', ReglasTenant::existeGlobalODelTenant('roles', $tenantId)],
        ];
    }

    public function toDto(): UsuarioDto
    {
        $v = $this->validated();
        $roles = array_values(array_map(
            fn (mixed $rol): int => (int) $rol,
            (array) ($v['roles'] ?? []),
        ));

        return new UsuarioDto(
            nombre: (string) $v['nombre'],
            apellido: isset($v['apellido']) ? (string) $v['apellido'] : null,
            alias: isset($v['alias']) ? (string) $v['alias'] : null,
            correo: (string) $v['correo'],
            password: isset($v['password']) ? (string) $v['password'] : null,
            telefono: isset($v['telefono']) ? (string) $v['telefono'] : null,
            sucursalId: isset($v['sucursal_id']) ? (int) $v['sucursal_id'] : null,
            roles: $roles,
            presentes: array_keys($v),
        );
    }
}
