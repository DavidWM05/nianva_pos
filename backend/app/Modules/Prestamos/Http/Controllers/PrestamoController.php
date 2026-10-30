<?php

namespace App\Modules\Prestamos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Prestamos\Http\Resources\PrestamoResource;
use App\Modules\Prestamos\Models\Prestamo;
use App\Modules\Prestamos\Services\PrestamoService;
use App\Modules\Tpv\Support\ReglasCaja;
use Illuminate\Http\Request;

class PrestamoController extends Controller
{
    private const CAMPOS_ORDENABLES = ['id', 'monto', 'saldo_pendiente', 'fecha_prestamo', 'created_at'];

    public function __construct(private readonly PrestamoService $prestamoService) {}

    public function show(Prestamo $prestamo)
    {
        $prestamo->load('pagos');

        return new PrestamoResource($prestamo);
    }

    public function index(Request $request)
    {
        $query = Prestamo::with('pagos');

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
            'data' => PrestamoResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request, 'prestamos', ['ver', 'crear', 'pagar']),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $tenantId = app(TenantContext::class)->id();

        $v = $request->validate([
            'proveedor_id' => ['nullable', 'integer', ReglasTenant::existe('proveedores', $tenantId)],
            'referencia' => 'nullable|string|max:100',
            'monto' => 'required|numeric|min:0.01',
            'interes' => 'nullable|numeric|min:0|max:100',
            'fecha_prestamo' => 'required|date',
            'fecha_vencimiento' => 'nullable|date|after_or_equal:fecha_prestamo',
            'notas' => 'nullable|string|max:1000',
        ]);
        $v['tenant_id'] = app(TenantContext::class)->id();

        return (new PrestamoResource($this->prestamoService->registrar($v)))->response()->setStatusCode(201);
    }

    public function registrarPago(Request $request, int $id)
    {
        $tenantId = app(TenantContext::class)->id();

        $v = $request->validate([
            'monto' => 'required|numeric|min:0.01',
            'caja_sesion_id' => ['nullable', 'integer', ReglasCaja::delTenant($tenantId)],
            'notas' => 'nullable|string|max:500',
        ]);

        return response()->json(['data' => $this->prestamoService->registrarPago($id, $v)]);
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
