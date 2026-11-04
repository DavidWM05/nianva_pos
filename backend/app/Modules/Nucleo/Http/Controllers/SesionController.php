<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Controllers;

use App\Aplicacion\Sesion\ObtenerSesion;
use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Resources\SesionResource;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Http\Request;

/**
 * GET /sesion (API-09): el usuario autenticado consulta su propia sesion. Sin permiso
 * especial, como /user, y fuera de two-factor.confirmed por la misma razon: el frontend la
 * pide antes de saber si debe mostrar la configuracion del 2FA.
 */
class SesionController extends Controller
{
    public function show(Request $request, ObtenerSesion $obtenerSesion): SesionResource
    {
        /** @var Usuario $usuario */
        $usuario = $request->user();

        return new SesionResource($obtenerSesion->ejecutar($usuario));
    }
}
