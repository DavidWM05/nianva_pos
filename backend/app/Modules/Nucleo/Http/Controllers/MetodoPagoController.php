<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Requests\GuardarMetodoPagoRequest;
use App\Modules\Nucleo\Http\Resources\MetodoPagoResource;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Nucleo\Support\GuardasDeRecurso;
use Illuminate\Http\Request;

/**
 * CRUD completo (Fase C). `?solo_activos=1` preserva el contrato original
 * (lista plana sin paginar) para el selector de metodo de pago del
 * formulario de venta -- ver MetodoPagoService.listar() en el frontend.
 *
 * tenant_id NULL = catalogo global sembrado (Efectivo/Tarjeta/
 * Transferencia, ver MetodosPagoSeeder) -- visible para todos los
 * tenants via TenantScope, pero NUNCA editable/desactivable por un
 * tenant normal (solo un superadmin), aunque tenga el permiso
 * metodos_pago.editar/eliminar: ver GuardasDeRecurso::metodoPagoGlobal(). store()
 * siempre crea con el tenant_id del usuario actual, nunca uno global.
 */
class MetodoPagoController extends Controller
{
    private const CAMPOS_ORDENABLES = ['nombre', 'tipo'];

    public function index(Request $request)
    {
        if ($request->boolean('solo_activos')) {
            return response()->json([
                'data' => MetodoPago::where('activo', true)->orderBy('nombre')->get(['id', 'nombre', 'tipo']),
            ]);
        }

        $query = MetodoPago::query();

        if ($nombre = $request->query('filtro_nombre')) {
            $query->where('nombre', 'like', "%{$nombre}%");
        }

        $sortField = $request->query('sort_field');
        if (is_string($sortField) && in_array($sortField, self::CAMPOS_ORDENABLES, true)) {
            $query->orderBy($sortField, $request->query('sort_order') === 'desc' ? 'desc' : 'asc');
        } else {
            $query->orderBy('nombre');
        }

        $rows = max(1, min(100, (int) $request->query('rows', 25)));
        $page = max(1, (int) $request->query('page', 1));
        $paginador = $query->paginate($rows, ['*'], 'page', $page);

        return response()->json([
            'data' => MetodoPagoResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request),
            ],
        ]);
    }

    public function show(Request $request, MetodoPago $metodoPago)
    {
        return response()->json([
            'data' => new MetodoPagoResource($metodoPago),
            'meta' => ['permisos' => $this->permisosDe($request)],
        ]);
    }

    public function store(GuardarMetodoPagoRequest $request)
    {
        $dto = $request->toDto();

        $metodoPago = MetodoPago::create([
            'tenant_id' => app(TenantContext::class)->id(),
            'nombre' => $dto->nombre,
            'tipo' => $dto->tipo,
            'incluir_en_financiero' => $dto->incluirEnFinanciero,
            'activo' => true,
        ]);

        return (new MetodoPagoResource($metodoPago))->response()->setStatusCode(201);
    }

    public function update(GuardarMetodoPagoRequest $request, MetodoPago $metodoPago)
    {
        $dto = $request->toDto();

        $metodoPago->update([
            'nombre' => $dto->nombre,
            'tipo' => $dto->tipo,
            'incluir_en_financiero' => $dto->incluirEnFinanciero,
        ]);

        return new MetodoPagoResource($metodoPago);
    }

    public function desactivar(Request $request, MetodoPago $metodoPago)
    {
        GuardasDeRecurso::metodoPagoGlobal($metodoPago, $request->user());

        $metodoPago->update(['activo' => false]);

        return new MetodoPagoResource($metodoPago);
    }

    /**
     * @return array{crear: bool, editar: bool, eliminar: bool}
     */
    private function permisosDe(Request $request): array
    {
        $usuario = $request->user();

        return [
            'crear' => $usuario->tienePermiso('metodos_pago.crear'),
            'editar' => $usuario->tienePermiso('metodos_pago.editar'),
            'eliminar' => $usuario->tienePermiso('metodos_pago.eliminar'),
        ];
    }
}
