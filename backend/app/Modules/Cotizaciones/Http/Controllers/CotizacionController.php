<?php

namespace App\Modules\Cotizaciones\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Cotizaciones\Http\Resources\CotizacionResource;
use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Cotizaciones\Services\CotizacionService;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Http\Request;

/**
 * CRUD de cotizaciones/presupuestos.
 *
 * store()/actualizar() nunca calculan precios — se reciben del frontend
 * (que los obtuvo via GET /api/producto-variantes/{id}/precio o similares).
 * convertirAVenta() orquesta CotizacionService + VentaService.
 */
class CotizacionController extends Controller
{
    private const CAMPOS_ORDENABLES = ['id', 'total', 'created_at', 'fecha_vencimiento'];

    public function index(Request $request)
    {
        $query = Cotizacion::query()->with(['cliente:id,nombre']);

        if ($estado = $request->query('filtro_estado')) {
            $query->where('estado', $estado);
        }

        if ($clienteId = $request->query('filtro_cliente_id')) {
            $query->where('cliente_id', $clienteId);
        }

        if ($desde = $request->query('desde')) {
            $query->whereDate('created_at', '>=', $desde);
        }

        if ($hasta = $request->query('hasta')) {
            $query->whereDate('created_at', '<=', $hasta);
        }

        if ($numero = $request->query('filtro_numero_cotizacion')) {
            $query->where('numero_cotizacion', 'like', "%{$numero}%");
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
            'data' => CotizacionResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request, 'cotizaciones', ['ver', 'crear', 'editar', 'eliminar', 'convertir']),
            ],
        ]);
    }

    public function store(Request $request, CotizacionService $cotizacionService)
    {
        $validated = $request->validate([
            'cliente_id' => ['nullable', 'integer', 'exists:clientes,id'],
            'sucursal_id' => ['required', 'integer', 'exists:sucursales,id'],
            'validez_dias' => ['nullable', 'integer', 'min:1', 'max:365'],
            'descuento' => ['nullable', 'numeric', 'min:0'],
            'uso_cfdi' => ['nullable', 'string', 'max:10'],
            'observaciones' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.variante_id' => ['required', 'integer', 'exists:producto_variantes,id'],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
            'items.*.precio_unitario' => ['required', 'numeric', 'min:0'],
            'items.*.descuento' => ['nullable', 'numeric', 'min:0'],
        ]);

        $usuario = $request->user();
        $tenantId = app(TenantContext::class)->id();

        $cotizacion = $cotizacionService->crear(
            [
                'tenant_id' => $tenantId,
                'sucursal_id' => $validated['sucursal_id'],
                'usuario_id' => $usuario->id,
                'cliente_id' => $validated['cliente_id'] ?? null,
                'validez_dias' => $validated['validez_dias'] ?? 15,
                'descuento' => $validated['descuento'] ?? 0,
                'observaciones' => $validated['observaciones'] ?? null,
                'uso_cfdi' => $validated['uso_cfdi'] ?? null,
            ],
            $validated['items'],
        );

        return (new CotizacionResource($cotizacion))->response()->setStatusCode(201);
    }

    public function show(Cotizacion $cotizacion)
    {
        $cotizacion->load(['cliente', 'usuario', 'detalles.variante.producto']);

        return new CotizacionResource($cotizacion);
    }

    public function update(Request $request, int $id, CotizacionService $cotizacionService)
    {
        $validated = $request->validate([
            'cliente_id' => ['nullable', 'integer', 'exists:clientes,id'],
            'validez_dias' => ['nullable', 'integer', 'min:1', 'max:365'],
            'descuento' => ['nullable', 'numeric', 'min:0'],
            'uso_cfdi' => ['nullable', 'string', 'max:10'],
            'observaciones' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.variante_id' => ['required', 'integer', 'exists:producto_variantes,id'],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
            'items.*.precio_unitario' => ['required', 'numeric', 'min:0'],
            'items.*.descuento' => ['nullable', 'numeric', 'min:0'],
        ]);

        $cotizacion = $cotizacionService->actualizar($id, $validated, $validated['items']);

        return new CotizacionResource($cotizacion);
    }

    public function destroy(int $id, CotizacionService $cotizacionService)
    {
        $cotizacionService->anular($id);

        return response()->json(['message' => 'Cotización anulada correctamente.']);
    }

    public function convertir(Request $request, int $id, CotizacionService $cotizacionService)
    {
        $validated = $request->validate([
            'metodo_pago_id' => ['required', 'integer', 'exists:metodos_pago,id'],
        ]);

        $usuario = $request->user();

        $venta = $cotizacionService->convertirAVenta($id, [
            'usuario_id' => $usuario->id,
            'metodo_pago_id' => $validated['metodo_pago_id'],
        ]);

        return response()->json([
            'message' => 'Cotización convertida a venta correctamente.',
            'venta_id' => $venta->id,
        ]);
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
