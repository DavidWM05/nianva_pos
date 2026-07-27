<?php

namespace App\Modules\Gastos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Gastos\Http\Resources\GastoResource;
use App\Modules\Gastos\Models\Gasto;
use App\Modules\Gastos\Services\GastoService;
use Illuminate\Http\Request;

/**
 * Sin pantalla propia (ver el reporte) -- vive dentro de la vista de
 * caja de TPV, por eso index() no pagina ni filtra por nada mas que la
 * sesion de caja que el frontend ya conoce (viene de GET /caja/actual).
 * store() nunca acepta caja_sesion_id del cliente -- GastoService la
 * resuelve el mismo, igual que VentaService con la venta.
 */
class GastoController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'caja_sesion_id' => ['required', 'integer', 'exists:caja_sesiones,id'],
        ]);

        $gastos = Gasto::where('caja_sesion_id', $validated['caja_sesion_id'])
            ->orderByDesc('fecha')
            ->get();

        return response()->json(['data' => GastoResource::collection($gastos)]);
    }

    public function store(Request $request, GastoService $gastoService)
    {
        $validated = $request->validate([
            'descripcion' => ['required', 'string', 'max:255'],
            'monto' => ['required', 'numeric', 'min:0.01'],
        ]);

        $usuario = $request->user();

        $gasto = $gastoService->registrarGasto(
            $usuario->sucursal_id,
            $usuario->id,
            $validated['descripcion'],
            $validated['monto'],
        );

        return (new GastoResource($gasto))->response()->setStatusCode(201);
    }
}
