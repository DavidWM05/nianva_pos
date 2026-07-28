<?php

namespace App\Modules\Tpv\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\CuentasCobrar\Models\AbonoCuenta;
use App\Modules\CuentasPagar\Models\AbonoPagar;
use App\Modules\GiftCards\Models\GiftCardRecarga;
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
 *
 * Instancia #8 de orquestacion documentada (ver docs/03_ESPECIFICACION_BACKEND.md §9):
 * cerrar() ademas de totalGastos, orquesta la consulta de abonos_cuenta
 * (CxC), recargas_gift_card y pagos_cxp para calcular el total teorico
 * final. La regla se mantiene: Controllers orquestan, Services nunca.
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
     * Instancia #8 de orquestacion (ver docs/03_ESPECIFICACION_BACKEND.md §9):
     * calcula el total teorico incluyendo abonos_cuenta (CxC cobradas),
     * recargas_gift_card y pagos_cxp_realizados, ademas de los gastos.
     * No toca CajaService::cerrarCaja() -- la orquestacion vive en el Controller.
     *
     * Formula: total_teorico = apertura + ventas + abonos_cxc + recargas_gc
     *                         - pagos_cxp - gastos
     */
    public function cerrar(Request $request, CajaSesion $cajaSesion, CajaService $cajaService, GastoService $gastoService)
    {
        $validated = $request->validate([
            'monto_fisico' => ['required', 'numeric', 'min:0'],
        ]);

        $cajaSesionId = $cajaSesion->id;
        $sucursalId = $cajaSesion->sucursal_id;

        // Gastos de la sesion
        $totalGastos = $gastoService->totalGastos($cajaSesionId);

        // Abonos de CxC registrados en esta caja (ingresos)
        $totalAbonosCxc = round((float) AbonoCuenta::where('caja_sesion_id', $cajaSesionId)->sum('monto'), 2);

        // Recargas de Gift Card registradas en esta caja (ingresos)
        $totalRecargasGc = round((float) GiftCardRecarga::sinTenant()
            ->where('caja_sesion_id', $cajaSesionId)
            ->sum('monto'), 2);

        // Pagos de CxP registrados en esta caja (egresos)
        $totalPagosCxp = round((float) AbonoPagar::where('caja_sesion_id', $cajaSesionId)->sum('monto'), 2);

        // Ajustar totalGastos para incluir los nuevos conceptos siguiendo
        // la formula: total_teorico = apertura + ventas + abonos_cxc + recargas_gc
        //                               - pagos_cxp - gastos
        // CajaService hace: apertura + ventas - totalGastos
        // Por lo tanto: totalGastosAjustado = gastos + pagos_cxp - abonos_cxc - recargas_gc
        $totalGastosAjustado = $totalGastos + $totalPagosCxp - $totalAbonosCxc - $totalRecargasGc;

        $sesion = $cajaService->cerrarCaja($cajaSesion, $validated['monto_fisico'], $totalGastosAjustado);

        return response()->json([
            'data' => new CajaSesionResource($sesion),
            'desglose' => [
                'total_gastos' => $totalGastos,
                'total_abonos_cxc' => $totalAbonosCxc,
                'total_recargas_gc' => $totalRecargasGc,
                'total_pagos_cxp' => $totalPagosCxp,
            ],
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
