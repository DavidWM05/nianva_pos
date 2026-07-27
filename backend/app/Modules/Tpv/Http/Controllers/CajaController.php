<?php

namespace App\Modules\Tpv\Http\Controllers;

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
 * Importa GastoService directamente (Tpv->Gastos) aunque CajaService no lo
 * haga -- CajaService documenta a proposito por que NO debe conocer
 * Gastos (mantiene la direccion de dependencia "lo nuevo depende de lo
 * viejo"), pero la capa de Http si puede orquestar entre modulos: aqui
 * solo se USA GastoService::totalGastos(), nunca al reves.
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
                // Solo tiene sentido con una sesion abierta -- total_ventas_sistema
                // ya cumple este rol una vez cerrada (ver CajaSesionResource).
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
     * Primera de 3 excepciones documentadas a la regla de dependencia
     * unidireccional entre modulos (Gastos depende de Tpv, nunca al reves --
     * ver el docblock de CajaService): este metodo si importa GastoService,
     * porque el monto de cierre de caja tiene que ser un calculo
     * autoritativo del backend, no un dato que el cliente pueda mandar.
     * El patron es "los Controllers pueden orquestar entre modulos para
     * presentacion/calculo autoritativo; los Services nunca" -- de ahi que
     * CajaService en si mismo siga sin conocer Gastos, y solo la capa Http
     * (este metodo y actual()) cruce la frontera. Las otras 2:
     * ProductoVarianteController (Inventario->Configuracion) e
     * InicioController::resumen() (Nucleo->Tpv+Apartados) -- ver el mapa
     * completo en docs/MANUAL_TECNICO.md.
     */
    public function cerrar(Request $request, CajaSesion $cajaSesion, CajaService $cajaService, GastoService $gastoService)
    {
        $validated = $request->validate([
            'monto_fisico' => ['required', 'numeric', 'min:0'],
        ]);

        // total_gastos ya NO se acepta del cliente (antes de que existiera
        // GastoController era el unico dato disponible) -- ahora que Gastos
        // tiene su propia autoridad, se resuelve aqui siempre, para que
        // nadie pueda cerrar la caja con una diferencia manipulada.
        $totalGastos = $gastoService->totalGastos($cajaSesion->id);

        $sesion = $cajaService->cerrarCaja($cajaSesion, $validated['monto_fisico'], $totalGastos);

        return new CajaSesionResource($sesion);
    }

    private function sesionAbierta(Request $request): ?CajaSesion
    {
        return CajaSesion::where('sucursal_id', $request->user()->sucursal_id)
            ->where('estado', 'abierta')
            ->latest('id')
            ->first();
    }
}
