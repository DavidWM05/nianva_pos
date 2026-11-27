<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Resources;

use App\Modules\Nucleo\Dtos\SesionDto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * GET /sesion (API-09). El usuario se serializa con UsuarioResource, la misma forma que
 * /user y el login. La terminal es null hasta que se selecciona una para la sesión (ver
 * ObtenerSesion).
 *
 * @property SesionDto $resource
 */
class SesionResource extends JsonResource
{
    /**
     * @return array{
     *     usuario: UsuarioResource,
     *     sucursal: array{id: int, nombre: string}|null,
     *     terminal: array{id: int, nombre: string, sucursal_id: int}|null,
     *     plan?: array{codigo: string, nombre: string, features: list<string>}|null,
     *     limites?: array{terminales: array{maximo: int, uso: int}, sucursales: array{maximo: int, uso: int}}|null,
     *     permisos: list<string>,
     *     modulos_activos: list<string>,
     *     regional: array{locale: string, moneda: string, zona_horaria: string},
     *     perfil_giro: null
     * }
     */
    public function toArray(Request $request): array
    {
        $sesion = $this->resource;

        return [
            'usuario' => new UsuarioResource($sesion->usuario),
            'sucursal' => $sesion->sucursal,
            'terminal' => $sesion->terminal,
            'plan' => $sesion->plan,
            'limites' => $sesion->limites,
            'permisos' => $sesion->permisos,
            'modulos_activos' => $sesion->modulosActivos,
            'regional' => $sesion->regional,
            'perfil_giro' => null,
        ];
    }
}
