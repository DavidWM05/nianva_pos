<?php

namespace App\Modules\Nucleo\Http\Resources;

use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Resource de administracion (pantalla Usuarios) -- distinto de
 * UsuarioResource (el "quien soy" del bootstrap de auth, ver
 * AuthController/TwoFactorController): expone sucursal/roles completos
 * (no solo nombres de rol) porque aqui SI hace falta editar esa
 * asignacion, y nunca incluye password/2FA (ya ocultos via #[Hidden] en
 * el modelo, pero explicito aqui de todas formas).
 *
 * @mixin Usuario
 */
class UsuarioAdminResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'apellido' => $this->apellido,
            'alias' => $this->alias,
            'correo' => $this->correo,
            'telefono' => $this->telefono,
            'activo' => $this->activo,
            'ultimo_login' => $this->ultimo_login,
            'dos_factor_confirmado' => $this->two_factor_confirmed_at !== null,
            'sucursal' => $this->whenLoaded('sucursal', fn () => $this->sucursal ? [
                'id' => $this->sucursal->id,
                'nombre' => $this->sucursal->nombre,
            ] : null),
            'roles' => $this->whenLoaded('roles', fn () => $this->roles->map(fn ($rol) => [
                'id' => $rol->id,
                'nombre' => $rol->nombre,
            ])),
        ];
    }
}
