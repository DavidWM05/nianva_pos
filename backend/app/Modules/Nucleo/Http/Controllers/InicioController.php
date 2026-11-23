<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Aplicacion\Inicio\ObtenerResumenInicio;
use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Requests\ConsultarInicioRequest;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\DecimalApi;
use Illuminate\Http\JsonResponse;

/**
 * Orquestacion: App\Aplicacion\Inicio\ObtenerResumenInicio.
 * Permiso: reportes.ver.
 */
class InicioController extends Controller
{
    public function resumen(ConsultarInicioRequest $request, ObtenerResumenInicio $obtenerResumenInicio): JsonResponse
    {
        $usuario = $request->user();
        $resumen = $obtenerResumenInicio->ejecutar($request->toDto(), $usuario instanceof Usuario && $usuario->tienePermiso('reportes.costos'));

        return response()->json(['data' => [
            ...$resumen,
            'ventas_hoy' => [
                'cantidad' => $resumen['ventas_hoy']['cantidad'],
                'total' => DecimalApi::dinero($resumen['ventas_hoy']['total']),
            ],
            'apartados_por_vencer' => $resumen['apartados_por_vencer']->map(fn ($apartado) => [
                'id' => (string) $apartado['id'],
                'folio' => $apartado['folio'] === null ? null : (string) $apartado['folio'],
                'cliente_nombre' => $apartado['cliente_nombre'] === null ? null : (string) $apartado['cliente_nombre'],
                'fecha_vencimiento' => (string) $apartado['fecha_vencimiento'],
                'dias_para_vencer' => (int) $apartado['dias_para_vencer'],
                'total' => DecimalApi::dinero($apartado['total']),
                'total_abonado' => DecimalApi::dinero($apartado['total_abonado']),
            ]),
        ]]);
    }
}
