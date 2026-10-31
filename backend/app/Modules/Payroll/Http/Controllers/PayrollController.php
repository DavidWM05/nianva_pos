<?php

namespace App\Modules\Payroll\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Payroll\Http\Requests\CrearEmpleadoRequest;
use App\Modules\Payroll\Http\Requests\GenerarNominaRequest;
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

    public function empleadosStore(CrearEmpleadoRequest $request)
    {
        $datos = $request->toDto()->datos();
        $datos['tenant_id'] = app(TenantContext::class)->id();

        return (new EmpleadoResource($this->nominaService->registrarEmpleado($datos)))->response()->setStatusCode(201);
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

    public function nominasGenerar(GenerarNominaRequest $request)
    {
        $dto = $request->toDto();

        return (new NominaResource($this->nominaService->generarNomina($dto->sucursalId, $dto->periodoInicio, $dto->periodoFin)))->response()->setStatusCode(201);
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
