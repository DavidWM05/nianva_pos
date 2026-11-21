<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Support;

use App\Modules\Nucleo\Dtos\OperacionSupervisorDto;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\HuellaSupervisor;
use Illuminate\Http\Request;

final class OperacionSupervisorHttp
{
    public const CABECERA = 'X-Autorizacion-Supervisor';

    public static function de(Request $request): OperacionSupervisorDto
    {
        $usuario = $request->user();
        abort_unless($usuario instanceof Usuario, 401);

        return new OperacionSupervisorDto(
            $usuario,
            $request->headers->get(self::CABECERA),
            HuellaSupervisor::de($request->all()),
            self::sesion($request),
        );
    }

    public static function sesion(Request $request): ?string
    {
        return $request->hasSession() ? hash('sha256', $request->session()->getId()) : null;
    }
}
