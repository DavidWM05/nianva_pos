<?php

namespace App\Modules\Nucleo\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Forma unica de serializar al usuario autenticado -- la usan
 * AuthController, TwoFactorController y la ruta /api/user, para que el
 * frontend siempre reciba la misma forma sin importar por cual endpoint
 * llego. Nunca expone two_factor_secret/two_factor_recovery_codes (ya
 * ocultos por #[Hidden] en el modelo, pero tampoco se leen aqui).
 */
class UsuarioResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'apellido' => $this->apellido,
            'correo' => $this->correo,
            'tenant_id' => $this->tenant_id,
            'sucursal_id' => $this->sucursal_id,
            'es_superadmin' => $this->esSuperadmin(),
            'roles' => $this->roles->pluck('nombre')->values(),
            'requiere_dos_factor' => $this->requiereDosFactor(),
            'dos_factor_confirmado' => $this->two_factor_confirmed_at !== null,
        ];
    }
}
