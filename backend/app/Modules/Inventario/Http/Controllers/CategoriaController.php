<?php

namespace App\Modules\Inventario\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventario\Http\Requests\GuardarCategoriaRequest;
use App\Modules\Inventario\Http\Resources\CategoriaResource;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Http\Request;

/**
 * CRUD completo (Fase C) -- reutiliza el mismo namespace de permisos que
 * ProductoController/ProveedorController (inventario.ver/crear/editar/
 * eliminar), no uno dedicado "categorias.*": son catalogos del mismo
 * modulo, mismo criterio que ya aplicaba Proveedor.
 *
 * `?solo_activos=1` preserva el contrato ORIGINAL de este endpoint (lista
 * plana {id,nombre}, sin paginar, solo activos) para el selector de
 * ProductoFormComponent -- ver ProductoService.categorias(). Sin ese
 * parametro, index() sirve la lista paginada/filtrable de la pantalla de
 * administracion nueva.
 */
class CategoriaController extends Controller
{
    private const CAMPOS_ORDENABLES = ['nombre'];

    public function index(Request $request)
    {
        if ($request->boolean('solo_activos')) {
            return response()->json([
                'data' => Categoria::where('activo', true)->orderBy('nombre')->get(['id', 'nombre']),
            ]);
        }

        $query = Categoria::query();

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
            'data' => CategoriaResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request),
            ],
        ]);
    }

    public function show(Request $request, Categoria $categoria)
    {
        return response()->json([
            'data' => new CategoriaResource($categoria),
            'meta' => ['permisos' => $this->permisosDe($request)],
        ]);
    }

    public function store(GuardarCategoriaRequest $request)
    {
        $datos = $request->toDto()->datosPresentes();
        $datos['tenant_id'] = app(TenantContext::class)->id();
        $datos['activo'] = true;

        $categoria = Categoria::create($datos);

        return (new CategoriaResource($categoria))->response()->setStatusCode(201);
    }

    public function update(GuardarCategoriaRequest $request, Categoria $categoria)
    {
        $categoria->update($request->toDto()->datosPresentes());

        return new CategoriaResource($categoria);
    }

    public function desactivar(Categoria $categoria)
    {
        $categoria->update(['activo' => false]);

        return new CategoriaResource($categoria);
    }

    /**
     * @return array{crear: bool, editar: bool, eliminar: bool}
     */
    private function permisosDe(Request $request): array
    {
        $usuario = $request->user();

        return [
            'crear' => $usuario->tienePermiso('inventario.crear'),
            'editar' => $usuario->tienePermiso('inventario.editar'),
            'eliminar' => $usuario->tienePermiso('inventario.eliminar'),
        ];
    }
}
