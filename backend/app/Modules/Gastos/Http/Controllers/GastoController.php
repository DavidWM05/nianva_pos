<?php

namespace App\Modules\Gastos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Gastos\Http\Requests\CrearGastoRequest;
use App\Modules\Gastos\Http\Requests\ListarGastosRequest;
use App\Modules\Gastos\Http\Resources\GastoResource;
use App\Modules\Gastos\Models\Gasto;
use App\Modules\Gastos\Services\GastoService;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\SucursalOperacion;

/**
 * Sin pantalla propia (ver el reporte) -- vive dentro de la vista de
 * caja de TPV, por eso index() no pagina ni filtra por nada mas que la
 * sesion de caja que el frontend ya conoce (viene de GET /caja/actual).
 * store() nunca acepta caja_sesion_id del cliente -- GastoService la
 * resuelve el mismo, igual que VentaService con la venta.
 */
class GastoController extends Controller
{
    public function index(ListarGastosRequest $request)
    {
        $usuario = $request->user();
        $sucursalId = $usuario instanceof Usuario ? SucursalOperacion::paraFiltro($usuario, null) : null;

        $consulta = Gasto::where('caja_sesion_id', $request->toDto()->cajaSesionId);

        if ($sucursalId !== null) {
            $consulta->where('sucursal_id', $sucursalId);
        }

        $gastos = $consulta->orderByDesc('fecha')->get();

        return response()->json(['data' => GastoResource::collection($gastos)]);
    }

    public function store(CrearGastoRequest $request, GastoService $gastoService)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $dto = $request->toDto();

        $gasto = $gastoService->registrarGasto(
            (int) $usuario->getAttribute('sucursal_id'),
            $usuario->id,
            $dto->descripcion,
            $dto->monto,
        );

        return (new GastoResource($gasto))->response()->setStatusCode(201);
    }
}
