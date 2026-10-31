<?php

namespace App\Modules\VentasPlazos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Tpv\Models\Venta;
use App\Modules\VentasPlazos\Http\Requests\CrearPlanPagoRequest;
use App\Modules\VentasPlazos\Http\Requests\PagarCuotaRequest;
use App\Modules\VentasPlazos\Http\Resources\PlanPagoResource;
use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use App\Modules\VentasPlazos\Services\VentasPlazosService;
use Illuminate\Http\Request;

class PlanPagoController extends Controller
{
    public function __construct(private readonly VentasPlazosService $ventasPlazosService) {}

    public function index(Request $request)
    {
        $query = PlanPagoCliente::with('cliente:id,nombre');

        $sortField = $request->query('sort_field');
        if (is_string($sortField) && in_array($sortField, ['id', 'monto_total', 'fecha_inicio', 'created_at'], true)) {
            $query->orderBy($sortField, $request->query('sort_order') === 'desc' ? 'desc' : 'asc');
        } else {
            $query->orderByDesc('id');
        }

        $rows = max(1, min(100, (int) $request->query('rows', 25)));
        $page = max(1, (int) $request->query('page', 1));
        $paginador = $query->paginate($rows, ['*'], 'page', $page);

        $usuario = $request->user();

        return response()->json([
            'data' => PlanPagoResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => [
                    'crear' => $usuario->tienePermiso('ventas_plazos.crear'),
                ],
            ],
        ]);
    }

    public function show(PlanPagoCliente $plan)
    {
        $plan->load(['cliente', 'cuotas']);

        return new PlanPagoResource($plan);
    }

    public function crearPlan(CrearPlanPagoRequest $request, Venta $venta)
    {
        $plan = $this->ventasPlazosService->crearPlan($venta, $request->toDto()->datosParaServicio());

        return response()->json(['data' => $plan], 201);
    }

    public function pagarCuota(PagarCuotaRequest $request, PlanPagoCliente $plan)
    {
        $dto = $request->toDto();

        $cuota = $this->ventasPlazosService->pagarCuota($plan->id, $dto->cuotaId, $dto->datosParaServicio());

        return response()->json(['data' => $cuota]);
    }
}
