<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Aplicacion\Inicio\ObtenerResumenInicio;
use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Requests\ConsultarInicioRequest;
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
        $resumen = $obtenerResumenInicio->ejecutar($request->toDto());

        return response()->json(['data' => [
            ...$resumen,
            'ventas_hoy' => [
                'cantidad' => $resumen['ventas_hoy']['cantidad'],
                'total' => DecimalApi::dinero($resumen['ventas_hoy']['total']),
            ],
            'apartados_por_vencer' => $resumen['apartados_por_vencer']->map(fn ($apartado) => [
                ...$apartado,
                'total' => DecimalApi::dinero($apartado['total']),
                'total_abonado' => DecimalApi::dinero($apartado['total_abonado']),
            ]),
        ]]);
    }
}
