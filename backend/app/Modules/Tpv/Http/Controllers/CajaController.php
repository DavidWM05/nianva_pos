<?php

namespace App\Modules\Tpv\Http\Controllers;

use App\Aplicacion\Caja\CerrarCaja;
use App\Http\Controllers\Controller;
use App\Modules\Gastos\Services\GastoService;
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

    public function abrir(Request $request, CajaService $cajaService)
    {
        $validated = $request->validate([
            'monto_apertura' => ['required', 'numeric', 'min:0'],
        ]);

        $usuario = $request->user();
        $sesion = $cajaService->abrirCaja($usuario->sucursal_id, $usuario->id, $validated['monto_apertura']);

        return (new CajaSesionResource($sesion))->response()->setStatusCode(201);
    }

    /**
     * Orquestacion: App\Aplicacion\Caja\CerrarCaja.
     */
    public function cerrar(Request $request, CajaSesion $cajaSesion, CerrarCaja $cerrarCaja)
    {
        $validated = $request->validate([
            'monto_fisico' => ['required', 'numeric', 'min:0'],
        ]);

        $resultado = $cerrarCaja->ejecutar($cajaSesion, $validated['monto_fisico']);

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
