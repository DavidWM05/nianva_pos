<?php

namespace App\Modules\Tpv\Http\Controllers;

use App\Aplicacion\Caja\CerrarCaja;
use App\Aplicacion\Caja\ObtenerCajaActual;
use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Http\Requests\AbrirCajaRequest;
use App\Modules\Tpv\Http\Requests\CerrarCajaRequest;
use App\Modules\Tpv\Http\Resources\CajaSesionResource;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Services\CajaService;
use Illuminate\Http\Request;

/**
 * Sin index/CRUD de historial de sesiones -- solo lo que la pantalla de
 * caja necesita: saber si hay una sesion abierta para la sucursal del
 * usuario actual, abrir una y cerrarla. La sucursal SIEMPRE sale de
 * $request->user()->sucursal_id, nunca de un parametro del cliente -- un
 * vendedor no puede abrir/cerrar la caja de otra sucursal apuntando el
 * body a otro id.
 *
 * actual() y cerrar() delegan la orquestacion entre modulos en
 * App\Aplicacion\Caja.
 */
class CajaController extends Controller
{
    public function actual(Request $request, ObtenerCajaActual $obtenerCajaActual)
    {
        $usuario = $request->user();

        if (! $usuario instanceof Usuario) {
            abort(401);
        }

        $resultado = $obtenerCajaActual->ejecutar($usuario);

        return response()->json([
            'data' => $resultado['sesion'] ? new CajaSesionResource($resultado['sesion']) : null,
            'meta' => [
                'resumen' => $resultado['resumen'],
                'permisos' => $resultado['permisos'],
            ],
        ]);
    }

    public function abrir(AbrirCajaRequest $request, CajaService $cajaService)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $dto = $request->toDto();
        $sucursalId = (int) $usuario->getAttribute('sucursal_id');
        $sesion = $cajaService->abrirCaja($sucursalId, $usuario->id, $dto->montoApertura);

        return (new CajaSesionResource($sesion))->response()->setStatusCode(201);
    }

    /**
     * Orquestacion: App\Aplicacion\Caja\CerrarCaja.
     */
    public function cerrar(CerrarCajaRequest $request, CajaSesion $cajaSesion, CerrarCaja $cerrarCaja)
    {
        $dto = $request->toDto();

        $resultado = $cerrarCaja->ejecutar($cajaSesion, $dto->montoFisico);

        return response()->json([
            'data' => new CajaSesionResource($resultado['sesion']),
            'desglose' => $resultado['desglose'],
        ]);
    }
}
