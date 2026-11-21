<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Controllers;

use App\Aplicacion\Sesion\PinSesion;
use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Requests\DesbloquearSesionRequest;
use App\Modules\Nucleo\Http\Requests\GuardarPinSesionRequest;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

final class PinSesionController extends Controller
{
    public function guardar(GuardarPinSesionRequest $request, PinSesion $pin): Response
    {
        $pin->guardar($this->usuarioWeb($request), $request->toDto());

        return response()->noContent();
    }

    public function bloquear(Request $request, PinSesion $pin): Response
    {
        $pin->bloquear($this->usuarioWeb($request), $request->session());

        return response()->noContent();
    }

    public function desbloquear(DesbloquearSesionRequest $request, PinSesion $pin): Response
    {
        $pin->desbloquear($this->usuarioWeb($request), $request->session(), $request->toDto(), $request->ip(), $request->userAgent());

        return response()->noContent();
    }

    private function usuarioWeb(Request $request): Usuario
    {
        $usuario = Auth::guard('web')->user();
        abort_unless($request->hasSession() && $usuario instanceof Usuario && ! $usuario->esSuperadmin(), 403);

        return $usuario;
    }
}
