<?php

namespace App\Modules\Produccion\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Produccion\Http\Resources\InsumoResource;
use App\Modules\Produccion\Http\Resources\OrdenProduccionResource;
use App\Modules\Produccion\Http\Resources\RecetaResource;
use App\Modules\Produccion\Http\Resources\TransformacionResource;
use App\Modules\Produccion\Models\InsumoStock;
use App\Modules\Produccion\Models\Insumo;
use App\Modules\Produccion\Models\OrdenProduccion;
use App\Modules\Produccion\Models\Receta;
use App\Modules\Produccion\Models\TransformacionProducto;
use App\Modules\Produccion\Services\ProduccionService;
use Illuminate\Http\Request;

class ProduccionController extends Controller
{
    public function __construct(private readonly ProduccionService $produccionService) {}

    private const CAMPOS_ORDENABLES = ['id', 'nombre', 'costo', 'created_at'];

    public function insumosIndex(Request $request)
    {
        $query = Insumo::query();

        if ($nombre = $request->query('filtro_nombre')) {
            $query->where('nombre', 'like', "%{$nombre}%");
        }

        if ($sku = $request->query('filtro_sku')) {
            $query->where('sku', 'like', "%{$sku}%");
        }

        if ($request->boolean('stock_bajo')) {
            $query->whereRaw('stock_minimo > (select coalesce(sum(cantidad),0) from insumo_stocks where insumo_id = insumos.id and sucursal_id = ?)', [$request->user()->sucursal_id]);
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
            'data' => InsumoResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request, 'produccion', ['ver', 'crear', 'completar', 'transformar']),
            ],
        ]);
    }

    public function insumosStore(Request $request)
    {
        $v = $request->validate(['nombre' => 'required|string|max:200', 'sku' => 'nullable|string|max:50|unique:insumos,sku', 'unidad_medida_id' => 'required|integer|exists:unidades_medida,id', 'costo' => 'nullable|numeric|min:0', 'stock_minimo' => 'nullable|numeric|min:0']);
        $v['tenant_id'] = app(TenantContext::class)->id();
        return (new InsumoResource(Insumo::create($v)))->response()->setStatusCode(201);
    }

    public function insumoStocks(Insumo $insumo)
    {
        $stocks = InsumoStock::where('insumo_id', $insumo->id)->where('sucursal_id', request()->user()->sucursal_id)->get();
        return response()->json(['data' => $stocks]);
    }

    public function insumoStocksStore(Request $request, Insumo $insumo)
    {
        $validated = $request->validate([
            'sucursal_id' => ['required', 'integer', 'exists:sucursales,id'],
            'cantidad' => ['required', 'numeric', 'min:0.01'],
            'lote' => ['nullable', 'string', 'max:50'],
            'fecha_vencimiento' => ['nullable', 'date'],
        ]);

        $stock = InsumoStock::firstOrNew([
            'insumo_id' => $insumo->id,
            'sucursal_id' => $validated['sucursal_id'],
            'lote' => $validated['lote'] ?? null,
        ]);

        if ($stock->exists) {
            $stock->increment('cantidad', $validated['cantidad']);
        } else {
            $stock->fill([
                'cantidad' => $validated['cantidad'],
                'fecha_vencimiento' => $validated['fecha_vencimiento'] ?? null,
            ])->save();
        }

        return response()->json(['data' => $stock->fresh()], 201);
    }

    public function recetasIndex(Request $request)
    {
        $query = Receta::with('ingredientes');

        if ($v = $request->query('variante_id')) {
            $query->where('variante_id', $v);
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
            'data' => RecetaResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request, 'produccion', ['ver', 'crear', 'completar', 'transformar']),
            ],
        ]);
    }

    public function recetasStore(Request $request)
    {
        $v = $request->validate([
            'variante_id' => 'required|integer|exists:producto_variantes,id',
            'nombre' => 'required|string|max:200', 'rendimiento' => 'nullable|numeric|min:0.01',
            'instrucciones' => 'nullable|string', 'descripcion' => 'nullable|string',
            'ingredientes' => 'required|array|min:1',
            'ingredientes.*.insumo_id' => 'required|integer|exists:insumos,id',
            'ingredientes.*.cantidad' => 'required|numeric|min:0.01',
            'ingredientes.*.unidad_medida_id' => 'required|integer|exists:unidades_medida,id',
        ]);
        $v['tenant_id'] = app(TenantContext::class)->id();
        return (new RecetaResource($this->produccionService->crearReceta($v)))->response()->setStatusCode(201);
    }

    public function ordenesIndex(Request $request)
    {
        $query = OrdenProduccion::with('receta');

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
            'data' => OrdenProduccionResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request, 'produccion', ['ver', 'crear', 'completar', 'transformar']),
            ],
        ]);
    }

    public function ordenesStore(Request $request)
    {
        $v = $request->validate(['receta_id' => 'required|integer|exists:recetas,id', 'cantidad_programada' => 'required|integer|min:1', 'fecha_programada' => 'nullable|date', 'notas' => 'nullable|string|max:1000']);
        $v['tenant_id'] = app(TenantContext::class)->id();
        $v['sucursal_id'] = $request->user()->sucursal_id;
        $v['usuario_id'] = $request->user()->id;
        return (new OrdenProduccionResource($this->produccionService->crearOrdenProduccion($v)))->response()->setStatusCode(201);
    }

    public function ordenesCambiarEstado(Request $request, int $id)
    {
        $v = $request->validate(['estado' => 'required|string|in:pendiente,en_proceso,completada,cancelada', 'cantidad_producida' => 'required_if:estado,completada|integer|min:1']);
        if ($v['estado'] === 'completada') {
            return new OrdenProduccionResource($this->produccionService->completarOrden($id, $v['cantidad_producida']));
        }
        OrdenProduccion::where('id', $id)->update(['estado' => $v['estado']]);
        return response()->json(['message' => 'Estado actualizado.']);
    }

    public function transformacionesIndex(Request $request)
    {
        $query = TransformacionProducto::query();

        $sortField = $request->query('sort_field');
        if (is_string($sortField) && in_array($sortField, ['id', 'created_at'], true)) {
            $query->orderBy($sortField, $request->query('sort_order') === 'desc' ? 'desc' : 'asc');
        } else {
            $query->orderByDesc('id');
        }

        $rows = max(1, min(100, (int) $request->query('rows', 25)));
        $page = max(1, (int) $request->query('page', 1));
        $paginador = $query->paginate($rows, ['*'], 'page', $page);

        return response()->json([
            'data' => TransformacionResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request, 'produccion', ['ver', 'crear', 'completar', 'transformar']),
            ],
        ]);
    }

    public function transformacionStore(Request $request)
    {
        $v = $request->validate([
            'variante_origen_id' => 'required|integer|exists:producto_variantes,id',
            'variante_destino_id' => 'required|integer|exists:producto_variantes,id',
            'cantidad_origen' => 'required|numeric|min:0.01',
            'cantidad_destino' => 'required|numeric|min:0.01',
            'notas' => 'nullable|string|max:1000',
        ]);
        $v['tenant_id'] = app(TenantContext::class)->id();
        $v['sucursal_id'] = $request->user()->sucursal_id;
        $v['usuario_id'] = $request->user()->id;
        return (new TransformacionResource($this->produccionService->registrarTransformacion($v)))->response()->setStatusCode(201);
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
