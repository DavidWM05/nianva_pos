<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Controllers;

use App\Aplicacion\Sesion\ObtenerSesion;
use App\Aplicacion\Sesion\TerminalDeSesion;
use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Requests\ElegirTerminalRequest;
use App\Modules\Nucleo\Http\Resources\SesionResource;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

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

        return new SesionResource($obtenerSesion->ejecutar($usuario, $request->hasSession() ? $request->session() : null));
    }

    public function elegirTerminal(ElegirTerminalRequest $request, TerminalDeSesion $terminal): Response
    {
        $usuario = $request->user();
        abort_unless($usuario instanceof Usuario && $request->hasSession(), 403);
        $terminal->elegir($request->session(), $request->toDto()->terminalId);

        return response()->noContent();
    }
}
