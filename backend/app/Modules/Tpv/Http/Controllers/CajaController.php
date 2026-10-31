<?php

namespace App\Modules\Tpv\Http\Controllers;

use App\Aplicacion\Caja\CerrarCaja;
use App\Http\Controllers\Controller;
use App\Modules\Gastos\Services\GastoService;
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
 * cerrar() delega la orquestacion entre modulos en
 * App\Aplicacion\Caja\CerrarCaja. actual() conserva su lectura de
 * GastoService::totalGastos() (pendiente de otro encargo).
 */
class CajaController extends Controller
{
    public function actual(Request $request, CajaService $cajaService, GastoService $gastoService)
    {
        $sesion = $this->sesionAbierta($request);
        $usuario = $request->user();

        return response()->json([
            'data' => $sesion ? new CajaSesionResource($sesion) : null,
            'meta' => [
                'resumen' => $sesion ? [
                    ...$cajaService->resumenSesion($sesion),
                    'total_gastos' => $gastoService->totalGastos($sesion->id),
                ] : null,
                'permisos' => [
                    'abrir' => $usuario->tienePermiso('caja.abrir'),
                    'cerrar' => $usuario->tienePermiso('caja.cerrar'),
                    'gastos_ver' => $usuario->tienePermiso('gastos.ver'),
                    'gastos_crear' => $usuario->tienePermiso('gastos.crear'),
                ],
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

    private function sesionAbierta(Request $request): ?CajaSesion
    {
        return CajaSesion::where('sucursal_id', $request->user()->sucursal_id)
            ->where('estado', 'abierta')
            ->latest('id')
            ->first();
    }
}
