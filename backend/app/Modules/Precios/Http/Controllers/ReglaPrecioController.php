<?php

namespace App\Modules\Precios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Http\Requests\GuardarReglaPrecioRequest;
use App\Modules\Precios\Http\Resources\ReglaPrecioResource;
use App\Modules\Precios\Models\ReglaPrecio;
use Illuminate\Http\Request;

/**
 * Tercer modulo real conectado al shell (ver Crm\ClienteController /
 * Inventario\ProductoController para el mismo esquema). show() usa el
 * mismo permiso de lectura que index() (reglas_precio.ver) -- no hay uno
 * mas granular para "ver una regla puntual".
 */
class ReglaPrecioController extends Controller
{
    private const CAMPOS_ORDENABLES = ['nombre', 'fecha_inicio', 'fecha_fin'];

    public function index(Request $request)
    {
        $query = ReglaPrecio::query()->with(['categoria:id,nombre', 'producto:id,nombre', 'variante:id,talla,color,producto_id', 'variante.producto:id,nombre']);

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
            'data' => ReglaPrecioResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request, 'reglas_precio'),
            ],
        ]);
    }

    public function show(Request $request, ReglaPrecio $regla)
    {
        $regla->load(['categoria:id,nombre', 'producto:id,nombre', 'variante:id,talla,color,producto_id', 'variante.producto:id,nombre']);

        return response()->json([
            'data' => new ReglaPrecioResource($regla),
            'meta' => ['permisos' => $this->permisosDe($request, 'reglas_precio')],
        ]);
    }

    public function store(GuardarReglaPrecioRequest $request)
    {
        $datos = $request->toDto()->datos();
        $datos['tenant_id'] = app(TenantContext::class)->id();
        $datos['activo'] = true;

        $regla = ReglaPrecio::create($datos);
        $regla->load(['categoria:id,nombre', 'producto:id,nombre', 'variante:id,talla,color,producto_id', 'variante.producto:id,nombre']);

        return (new ReglaPrecioResource($regla))->response()->setStatusCode(201);
    }

    public function update(GuardarReglaPrecioRequest $request, ReglaPrecio $regla)
    {
        $regla->update($request->toDto()->datos());
        $regla->load(['categoria:id,nombre', 'producto:id,nombre', 'variante:id,talla,color,producto_id', 'variante.producto:id,nombre']);

        return new ReglaPrecioResource($regla);
    }

    public function desactivar(ReglaPrecio $regla)
    {
        $regla->update(['activo' => false]);

        return new ReglaPrecioResource($regla);
    }

    /**
     * @return array{crear: bool, editar: bool, eliminar: bool}
     */
    private function permisosDe(Request $request, string $modulo): array
    {
        $usuario = $request->user();

        return [
            'crear' => $usuario->tienePermiso("{$modulo}.crear"),
            'editar' => $usuario->tienePermiso("{$modulo}.editar"),
            'eliminar' => $usuario->tienePermiso("{$modulo}.eliminar"),
        ];
    }
}
