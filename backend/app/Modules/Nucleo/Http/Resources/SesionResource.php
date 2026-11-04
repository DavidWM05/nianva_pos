<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Resources;

use App\Modules\Nucleo\Dtos\SesionDto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * GET /sesion (API-09). El usuario se serializa con UsuarioResource, la misma forma que
 * /user y el login. `terminal` y `perfil_giro` van en null hasta que existan (ver
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
     *     terminal: null,
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
            'terminal' => null,
            'permisos' => $sesion->permisos,
            'modulos_activos' => $sesion->modulosActivos,
            'regional' => $sesion->regional,
            'perfil_giro' => null,
        ];
    }
}
