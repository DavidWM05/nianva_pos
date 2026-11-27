<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Controllers;

use App\Aplicacion\Caja\AbrirCaja;
use App\Aplicacion\Caja\CerrarCaja;
use App\Aplicacion\Caja\ObtenerCajaActual;
use App\Aplicacion\Sesion\TerminalDeSesion;
use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Support\OperacionSupervisorHttp;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Tpv\Exceptions\TerminalRequeridaException;
use App\Modules\Tpv\Http\Requests\AbrirCajaRequest;
use App\Modules\Tpv\Http\Requests\CerrarCajaRequest;
use App\Modules\Tpv\Http\Resources\CajaSaldoResource;
use App\Modules\Tpv\Http\Resources\CajaSesionResource;
use App\Modules\Tpv\Models\CajaSesion;
use Dedoc\Scramble\Attributes\HeaderParameter;
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
    public function actual(Request $request, ObtenerCajaActual $obtenerCajaActual, TerminalDeSesion $terminalDeSesion)
    {
        $usuario = $request->user();

        if (! $usuario instanceof Usuario) {
            abort(401);
        }

        $terminal = $terminalDeSesion->actual($usuario, $request->hasSession() ? $request->session() : null);
        $resultado = $obtenerCajaActual->ejecutar($usuario, $terminal);

        return response()->json([
            'data' => $resultado['sesion'] ? new CajaSesionResource($resultado['sesion']) : null,
            'meta' => [
                'resumen' => $resultado['sesion'] === null || $resultado['resumen'] === null ? null : [
                    /** @var non-negative-int */
                    'ventas_count' => (int) $resultado['resumen']['ventas_count'],
                    'total_ventas' => DecimalApi::dinero($resultado['resumen']['total_ventas']),
                    'total_gastos' => DecimalApi::dinero($resultado['resumen']['total_gastos']),
                    'metodos' => CajaSaldoResource::collection($resultado['sesion']->saldos),
                ],
                'permisos' => $resultado['permisos'],
            ],
        ]);
    }

    #[HeaderParameter(OperacionSupervisorHttp::CABECERA, description: 'Autorización para abrir después de consolidar la fecha operativa.', type: 'string')]
    public function abrir(AbrirCajaRequest $request, AbrirCaja $abrirCaja, TerminalDeSesion $terminalDeSesion)
    {
        $usuario = $request->user();

        if (! $usuario instanceof Usuario) {
            abort(401);
        }

        $terminal = $terminalDeSesion->actual($usuario, $request->hasSession() ? $request->session() : null);
        if ($terminal === null) {
            throw new TerminalRequeridaException;
        }

        $sesion = $abrirCaja->ejecutar($request->toDto(), $usuario, $terminal, OperacionSupervisorHttp::de($request));

        return (new CajaSesionResource($sesion))->response()->setStatusCode(201);
    }

    /**
     * Orquestacion: App\Aplicacion\Caja\CerrarCaja.
     */
    #[HeaderParameter(OperacionSupervisorHttp::CABECERA, description: 'Token opaco de supervisor para la operación autorizada.', type: 'string')]
    public function cerrar(CerrarCajaRequest $request, CajaSesion $cajaSesion, CerrarCaja $cerrarCaja, TerminalDeSesion $terminalDeSesion)
    {
        $dto = $request->toDto();

        $operacion = OperacionSupervisorHttp::de($request);
        abort_unless((int) $cajaSesion->getAttribute('sucursal_id') === (int) $operacion->usuario->getAttribute('sucursal_id'), 404);
        $terminal = $terminalDeSesion->actual($operacion->usuario, $request->hasSession() ? $request->session() : null);
        $remota = $terminal?->id !== (int) $cajaSesion->getAttribute('terminal_id');

        $resultado = $cerrarCaja->ejecutar($cajaSesion, $dto->conteos, $operacion, $remota);

        return response()->json([
            'data' => new CajaSesionResource($resultado['sesion']),
            'desglose' => [
                'total_gastos' => DecimalApi::dinero($resultado['desglose']['total_gastos']),
                'total_abonos_cxc' => DecimalApi::dinero($resultado['desglose']['total_abonos_cxc']),
                'total_recargas_gc' => DecimalApi::dinero($resultado['desglose']['total_recargas_gc']),
                'total_pagos_cxp' => DecimalApi::dinero($resultado['desglose']['total_pagos_cxp']),
            ],
        ]);
    }
}
