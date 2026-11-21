<?php

namespace App\Modules\VentasPlazos\Http\Controllers;

use App\Aplicacion\VentasPlazos\CrearPlanPago;
use App\Aplicacion\VentasPlazos\PagarCuota;
use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Tpv\Models\Venta;
use App\Modules\VentasPlazos\Http\Requests\CrearPlanPagoRequest;
use App\Modules\VentasPlazos\Http\Requests\PagarCuotaRequest;
use App\Modules\VentasPlazos\Http\Resources\PlanPagoResource;
use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use Illuminate\Http\Request;

class PlanPagoController extends Controller
{
    public function index(Request $request)
    {
        $query = PlanPagoCliente::with('cliente:id,ulid,nombre');

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

    public function crearPlan(CrearPlanPagoRequest $request, Venta $venta, CrearPlanPago $action)
    {
        $plan = $action->ejecutar($request->toDto(), $venta->id);

        return (new PlanPagoResource($plan))->response()->setStatusCode(201);
    }

    public function pagarCuota(PagarCuotaRequest $request, PlanPagoCliente $plan, PagarCuota $action)
    {
        $dto = $request->toDto();

        $cuota = $action->ejecutar($dto, $plan->id);
        // DAT-08: la cuota sale con los mismos campos que en PlanPagoResource (ulid como id), no como
        // modelo crudo con ids internos.
        $datos = [
            'id' => (string) $cuota->getAttribute('ulid'),
            'numero_cuota' => $cuota->numero_cuota,
            'monto' => DecimalApi::dinero($cuota->monto),
            'monto_capital' => DecimalApi::dinero($cuota->monto_capital),
            'monto_interes' => DecimalApi::dinero($cuota->monto_interes),
            'fecha_vencimiento' => $cuota->fecha_vencimiento,
            'fecha_pago' => $cuota->fecha_pago,
            /** @var 'pendiente'|'pagada'|'vencida' */
            'estado' => $cuota->estado,
        ];

        return response()->json(['data' => $datos]);
    }
}
