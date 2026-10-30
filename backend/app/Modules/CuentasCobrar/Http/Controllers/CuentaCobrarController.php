<?php

namespace App\Modules\CuentasCobrar\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\CuentasCobrar\Http\Resources\CuentaCobrarResource;
use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\CuentasCobrar\Services\CuentasCobrarService;
use App\Modules\Nucleo\Support\ReglasTenant;
use Illuminate\Http\Request;

/**
 * CRUD de cuentas por cobrar.
 *
 * store() NO existe aqui -- las CxC se crean orquestadas desde el flujo
 * de venta cuando tipo_pago = 'credito'.
 */
class CuentaCobrarController extends Controller
{
    private const CAMPOS_ORDENABLES = ['id', 'monto_total', 'saldo_pendiente', 'fecha_vencimiento', 'created_at'];

    public function index(Request $request)
    {
        $query = CuentaCobrar::query()->with(['cliente:id,nombre']);

        if ($estado = $request->query('filtro_estado')) {
            $query->where('estado', $estado);
        }

        if ($clienteId = $request->query('filtro_cliente_id')) {
            $query->where('cliente_id', $clienteId);
        }

        if ($request->boolean('vencidas')) {
            $query->where('estado', 'pendiente')
                ->where('fecha_vencimiento', '<', now()->toDateString());
        }

        if ($cliente = $request->query('filtro_cliente')) {
            $query->whereHas('cliente', fn ($c) => $c->where('nombre', 'like', "%{$cliente}%"));
        }

        $sortField = $request->query('sort_field');
        if (is_string($sortField) && in_array($sortField, self::CAMPOS_ORDENABLES, true)) {
            $query->orderBy($sortField, $request->query('sort_order') === 'desc' ? 'desc' : 'asc');
        } else {
            $query->orderByDesc('id');
        }

        $rows = max(1, min(100, (int) $request->query('rows', 25)));
        $page = max(1, (int) $request->query('page', 1));
        $paginador = $query->paginate($rows, ['*'], 'page', $page);

        return response()->json([
            'data' => CuentaCobrarResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request, 'cuentas_cobrar', ['ver', 'crear', 'registrar_abono', 'anular']),
            ],
        ]);
    }

    public function show(CuentaCobrar $cuentaCobrar)
    {
        $cuentaCobrar->load(['cliente', 'venta', 'abonos.metodoPago']);

        return new CuentaCobrarResource($cuentaCobrar);
    }

    public function registrarAbono(Request $request, int $id, CuentasCobrarService $service)
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'monto' => ['required', 'numeric', 'min:0.01'],
            'metodo_pago_id' => ['required', 'integer', ReglasTenant::existeGlobalODelTenant('metodos_pago', $tenantId)],
            'referencia' => ['nullable', 'string', 'max:100'],
        ]);

        $usuario = $request->user();

        $abono = $service->registrarAbono($id, [
            'sucursal_id' => $usuario->sucursal_id,
            'usuario_id' => $usuario->id,
            'monto' => $validated['monto'],
            'metodo_pago_id' => $validated['metodo_pago_id'],
            'referencia' => $validated['referencia'] ?? null,
        ]);

        $cuenta = CuentaCobrar::with('cliente')->findOrFail($id);

        return response()->json([
            'data' => [
                'abono' => $abono,
                'cuenta' => [
                    'id' => $cuenta->id,
                    'saldo_pendiente' => $cuenta->saldo_pendiente,
                    'estado' => $cuenta->estado,
                ],
            ],
            'message' => 'Abono registrado correctamente',
        ]);
    }

    public function anular(int $id, CuentasCobrarService $service)
    {
        $service->anular($id);

        return response()->json(['message' => 'Cuenta por cobrar anulada correctamente.']);
    }

    public function reporte(Request $request)
    {
        $limite = max(1, min(50, (int) $request->query('limite', 10)));
        $hoy = now()->toDateString();

        $base = CuentaCobrar::where('estado', 'pendiente');

        $totalPendiente = round((float) (clone $base)->sum('saldo_pendiente'), 2);
        $totalVencido = round((float) (clone $base)->where('fecha_vencimiento', '<', $hoy)->sum('saldo_pendiente'), 2);

        $porAntiguedad = [
            'al_dia' => '0.00',
            'vencido_1_30' => '0.00',
            'vencido_31_60' => '0.00',
            'vencido_61_90' => '0.00',
            'vencido_90_mas' => '0.00',
        ];

        foreach ((clone $base)->where('saldo_pendiente', '>', 0)->get() as $cuenta) {
            $dias = $cuenta->fecha_vencimiento ? max(0, $cuenta->fecha_vencimiento->diffInDays(now(), false)) : -1;
            $saldo = (float) $cuenta->saldo_pendiente;

            if ($dias <= 0) {
                $porAntiguedad['al_dia'] = (string) round((float) $porAntiguedad['al_dia'] + $saldo, 2);
            } elseif ($dias <= 30) {
                $porAntiguedad['vencido_1_30'] = (string) round((float) $porAntiguedad['vencido_1_30'] + $saldo, 2);
            } elseif ($dias <= 60) {
                $porAntiguedad['vencido_31_60'] = (string) round((float) $porAntiguedad['vencido_31_60'] + $saldo, 2);
            } elseif ($dias <= 90) {
                $porAntiguedad['vencido_61_90'] = (string) round((float) $porAntiguedad['vencido_61_90'] + $saldo, 2);
            } else {
                $porAntiguedad['vencido_90_mas'] = (string) round((float) $porAntiguedad['vencido_90_mas'] + $saldo, 2);
            }
        }

        $porCliente = (clone $base)
            ->selectRaw('cliente_id, sum(saldo_pendiente) as saldo_pendiente, count(*) as cuentas_pendientes')
            ->with('cliente:id,nombre')
            ->groupBy('cliente_id')
            ->orderByDesc('saldo_pendiente')
            ->limit($limite)
            ->get()
            ->map(fn ($r) => [
                'cliente_id' => $r->cliente_id,
                'cliente_nombre' => $r->cliente?->nombre,
                'saldo_pendiente' => round((float) $r->saldo_pendiente, 2),
                'cuentas_pendientes' => (int) $r->cuentas_pendientes,
            ]);

        return response()->json(['data' => [
            'total_pendiente' => $totalPendiente,
            'total_vencido' => $totalVencido,
            'por_antiguedad' => $porAntiguedad,
            'por_cliente' => $porCliente,
        ]]);
    }

    private function permisosDe(Request $request, string $modulo, array $acciones): array
    {
        $usuario = $request->user();
        $resultado = [];
        foreach ($acciones as $accion) {
            $resultado[$accion] = $usuario->tienePermiso("{$modulo}.{$accion}");
        }

        return $resultado;
    }
}
