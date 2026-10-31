<?php

namespace App\Modules\Produccion\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Produccion\Http\Requests\CambiarEstadoOrdenRequest;
use App\Modules\Produccion\Http\Requests\CrearInsumoRequest;
use App\Modules\Produccion\Http\Requests\CrearOrdenProduccionRequest;
use App\Modules\Produccion\Http\Requests\CrearRecetaRequest;
use App\Modules\Produccion\Http\Requests\CrearTransformacionRequest;
use App\Modules\Produccion\Http\Requests\GuardarInsumoStockRequest;
use App\Modules\Produccion\Http\Resources\InsumoResource;
use App\Modules\Produccion\Http\Resources\OrdenProduccionResource;
use App\Modules\Produccion\Http\Resources\RecetaResource;
use App\Modules\Produccion\Http\Resources\TransformacionResource;
use App\Modules\Produccion\Models\Insumo;
use App\Modules\Produccion\Models\InsumoStock;
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

    public function insumosStore(CrearInsumoRequest $request)
    {
        $datos = $request->toDto()->datosPresentes();
        $datos['tenant_id'] = app(TenantContext::class)->id();

        return (new InsumoResource(Insumo::create($datos)))->response()->setStatusCode(201);
    }

    public function insumoStocks(Insumo $insumo)
    {
        $stocks = InsumoStock::where('insumo_id', $insumo->id)->where('sucursal_id', request()->user()->sucursal_id)->get();

        return response()->json(['data' => $stocks]);
    }

    public function insumoStocksStore(GuardarInsumoStockRequest $request, Insumo $insumo)
    {
        $dto = $request->toDto();

        $stock = InsumoStock::firstOrNew([
            'insumo_id' => $insumo->id,
            'sucursal_id' => $dto->sucursalId,
            'lote' => $dto->lote,
        ]);

        if ($stock->exists) {
            $stock->increment('cantidad', $dto->cantidad);
        } else {
            $stock->fill([
                'cantidad' => $dto->cantidad,
                'fecha_vencimiento' => $dto->fechaVencimiento,
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

    public function recetasStore(CrearRecetaRequest $request)
    {
        $datos = $request->toDto()->datos();
        $datos['tenant_id'] = app(TenantContext::class)->id();

        return (new RecetaResource($this->produccionService->crearReceta($datos)))->response()->setStatusCode(201);
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

    public function ordenesStore(CrearOrdenProduccionRequest $request)
    {
        $usuario = $this->usuario($request);
        $datos = $request->toDto()->datos();
        $datos['tenant_id'] = app(TenantContext::class)->id();
        $datos['sucursal_id'] = (int) $usuario->getAttribute('sucursal_id');
        $datos['usuario_id'] = $usuario->id;

        return (new OrdenProduccionResource($this->produccionService->crearOrdenProduccion($datos)))->response()->setStatusCode(201);
    }

    public function ordenesCambiarEstado(CambiarEstadoOrdenRequest $request, int $id)
    {
        $dto = $request->toDto();

        if ($dto->estado === 'completada') {
            return new OrdenProduccionResource($this->produccionService->completarOrden($id, (int) $dto->cantidadProducida));
        }
        OrdenProduccion::where('id', $id)->update(['estado' => $dto->estado]);

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

    public function transformacionStore(CrearTransformacionRequest $request)
    {
        $usuario = $this->usuario($request);
        $datos = $request->toDto()->datos();
        $datos['tenant_id'] = app(TenantContext::class)->id();
        $datos['sucursal_id'] = (int) $usuario->getAttribute('sucursal_id');
        $datos['usuario_id'] = $usuario->id;

        return (new TransformacionResource($this->produccionService->registrarTransformacion($datos)))->response()->setStatusCode(201);
    }

    private function usuario(Request $request): Usuario
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        return $usuario;
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
