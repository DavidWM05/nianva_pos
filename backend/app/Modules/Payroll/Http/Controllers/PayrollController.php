<?php

namespace App\Modules\Payroll\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Nucleo\Support\SucursalOperacion;
use App\Modules\Payroll\Http\Resources\EmpleadoResource;
use App\Modules\Payroll\Http\Resources\NominaResource;
use App\Modules\Payroll\Models\Empleado;
use App\Modules\Payroll\Models\Nomina;
use App\Modules\Payroll\Services\NominaService;
use Illuminate\Http\Request;

class PayrollController extends Controller
{
    private const CAMPOS_ORDENABLES = ['id', 'salario_base', 'fecha_ingreso'];

    public function __construct(private readonly NominaService $nominaService) {}

    public function empleadosIndex(Request $request)
    {
        $query = Empleado::with('usuario');

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
            'data' => EmpleadoResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request, 'payroll', ['ver', 'crear', 'pagar']),
            ],
        ]);
    }

    public function empleadosShow(Empleado $empleado)
    {
        $empleado->load('usuario');

        return new EmpleadoResource($empleado);
    }

    public function empleadosStore(Request $request)
    {
        $tenantId = app(TenantContext::class)->id();

        $v = $request->validate([
            'usuario_id' => ['required', 'integer', ReglasTenant::existe('usuarios', $tenantId)],
            'sucursal_id' => ['required', 'integer', ReglasTenant::existe('sucursales', $tenantId)],
            'salario_base' => 'nullable|numeric|min:0',
            'tipo_salario' => 'nullable|string|in:fijo,por_hora',
            'fecha_ingreso' => 'nullable|date',
            'numero_seguridad_social' => 'nullable|string|max:30',
        ]);
        $v['tenant_id'] = app(TenantContext::class)->id();

        return (new EmpleadoResource($this->nominaService->registrarEmpleado($v)))->response()->setStatusCode(201);
    }

    public function nominasIndex(Request $request)
    {
        $query = Nomina::with('detalles.empleado.usuario');

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
            'data' => NominaResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request, 'payroll', ['ver', 'crear', 'pagar']),
            ],
        ]);
    }

    public function nominasShow(Nomina $nomina)
    {
        $nomina->load('detalles.empleado.usuario');

        return new NominaResource($nomina);
    }

    public function nominasGenerar(Request $request)
    {
        $tenantId = app(TenantContext::class)->id();

        $v = $request->validate([
            'sucursal_id' => ['nullable', 'integer', ReglasTenant::existe('sucursales', $tenantId)],
            'periodo_inicio' => 'required|date',
            'periodo_fin' => 'required|date|after_or_equal:periodo_inicio',
        ]);

        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $sucursalId = SucursalOperacion::paraEscritura($usuario, $v['sucursal_id'] ?? null);

        return (new NominaResource($this->nominaService->generarNomina($sucursalId, $v['periodo_inicio'], $v['periodo_fin'])))->response()->setStatusCode(201);
    }

    public function nominasPagar(int $id)
    {
        return new NominaResource($this->nominaService->pagarNomina($id));
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
