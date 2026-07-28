<?php

namespace App\Modules\Crm\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Crm\Http\Resources\PlanPagoResource;
use App\Modules\Crm\Models\PlanPagoCliente;
use App\Modules\Crm\Services\VentasPlazosService;
use App\Modules\Tpv\Models\Venta;
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

    public function crearPlan(Request $request, Venta $venta)
    {
        $v = $request->validate([
            'numero_cuotas' => 'required|integer|min:2|max:36',
            'tasa_interes' => 'nullable|numeric|min:0|max:100',
            'periodicidad' => 'nullable|string|in:semanal,quincenal,mensual',
            'fecha_inicio' => 'nullable|date',
        ]);

        $plan = $this->ventasPlazosService->crearPlan($venta, $v);

        return response()->json(['data' => $plan], 201);
    }

    public function pagarCuota(Request $request, PlanPagoCliente $plan)
    {
        $v = $request->validate([
            'cuota_id' => 'required|integer|exists:planes_pago_cliente_cuotas,id',
            'monto' => 'nullable|numeric|min:0.01',
        ]);

        $cuota = $this->ventasPlazosService->pagarCuota($plan->id, $v['cuota_id'], $v);

        return response()->json(['data' => $cuota]);
    }
}
