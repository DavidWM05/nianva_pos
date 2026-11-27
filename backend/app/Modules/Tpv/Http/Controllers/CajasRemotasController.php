<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Controllers;

use App\Aplicacion\Caja\ObtenerCajasRemotas;
use App\Aplicacion\Sesion\TerminalDeSesion;
use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Http\Resources\CajaRemotaResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class CajasRemotasController extends Controller
{
    public function __invoke(Request $request, TerminalDeSesion $terminalDeSesion, ObtenerCajasRemotas $cajas): AnonymousResourceCollection
    {
        $usuario = $request->user();
        abort_unless($usuario instanceof Usuario, 401);

        $terminal = $terminalDeSesion->actual($usuario, $request->hasSession() ? $request->session() : null);

        return CajaRemotaResource::collection($cajas->ejecutar((int) $usuario->getAttribute('sucursal_id'), $terminal));
    }
}
