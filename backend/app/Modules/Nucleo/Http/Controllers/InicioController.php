<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Aplicacion\Inicio\ObtenerResumenInicio;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Orquestacion: App\Aplicacion\Inicio\ObtenerResumenInicio.
 * Permiso: reportes.ver.
 */
class InicioController extends Controller
{
    public function resumen(Request $request, ObtenerResumenInicio $obtenerResumenInicio)
    {
        return response()->json([
            'data' => $obtenerResumenInicio->ejecutar($request->user()->sucursal_id),
        ]);
    }
}
