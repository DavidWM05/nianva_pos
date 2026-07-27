<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Models\DispositivoConfiable;
use App\Modules\Nucleo\Services\TrustedDeviceService;
use Illuminate\Http\Request;

/**
 * Lista y revocacion de los dispositivos confiables del propio usuario
 * (ver TrustedDeviceService) -- siempre acotado a $request->user(), nunca
 * a un usuario_id arbitrario del payload.
 */
class DispositivosConfiablesController extends Controller
{
    public function __construct(private readonly TrustedDeviceService $trustedDeviceService) {}

    public function index(Request $request)
    {
        $tokenActual = $request->cookie(TrustedDeviceService::NOMBRE_COOKIE);
        $hashActual = $tokenActual ? hash('sha256', $tokenActual) : null;

        $dispositivos = DispositivoConfiable::where('usuario_id', $request->user()->id)
            ->orderByDesc('fecha_creacion')
            ->get()
            ->map(fn (DispositivoConfiable $dispositivo) => [
                'id' => $dispositivo->id,
                'user_agent' => $dispositivo->user_agent,
                'ip_registro' => $dispositivo->ip_registro,
                'fecha_creacion' => $dispositivo->fecha_creacion,
                'fecha_expiracion' => $dispositivo->fecha_expiracion,
                'es_actual' => $hashActual !== null && $dispositivo->identificador_dispositivo === $hashActual,
            ]);

        return response()->json(['data' => $dispositivos]);
    }

    public function destroy(Request $request, int $dispositivo)
    {
        $eliminado = DispositivoConfiable::where('id', $dispositivo)
            ->where('usuario_id', $request->user()->id)
            ->delete();

        if (! $eliminado) {
            abort(404, 'Dispositivo no encontrado.');
        }

        return response()->noContent();
    }

    public function destroyTodos(Request $request)
    {
        $this->trustedDeviceService->revocarTodos($request->user());

        return response()->noContent();
    }
}
