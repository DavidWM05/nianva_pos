<?php

namespace App\Modules\Inventario\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventario\Http\Requests\GuardarDepartamentoRequest;
use App\Modules\Inventario\Http\Resources\DepartamentoResource;
use App\Modules\Inventario\Models\Departamento;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Http\Request;

/**
 * Ver CategoriaController -- mismo criterio exacto (CRUD completo, mismo
 * namespace de permisos inventario.*, mismo `?solo_activos=1` para
 * preservar el selector de ProductoFormComponent).
 */
class DepartamentoController extends Controller
{
    private const CAMPOS_ORDENABLES = ['nombre'];

    public function index(Request $request)
    {
        if ($request->boolean('solo_activos')) {
            return response()->json([
                'data' => Departamento::where('activo', true)->orderBy('nombre')->get(['id', 'nombre']),
            ]);
        }

        $query = Departamento::query();

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
            'data' => DepartamentoResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request),
            ],
        ]);
    }

    public function show(Request $request, Departamento $departamento)
    {
        return response()->json([
            'data' => new DepartamentoResource($departamento),
            'meta' => ['permisos' => $this->permisosDe($request)],
        ]);
    }

    public function store(GuardarDepartamentoRequest $request)
    {
        $datos = $request->toDto()->datosPresentes();
        $datos['tenant_id'] = app(TenantContext::class)->id();
        $datos['activo'] = true;

        $departamento = Departamento::create($datos);

        return (new DepartamentoResource($departamento))->response()->setStatusCode(201);
    }

    public function update(GuardarDepartamentoRequest $request, Departamento $departamento)
    {
        $departamento->update($request->toDto()->datosPresentes());

        return new DepartamentoResource($departamento);
    }

    public function desactivar(Departamento $departamento)
    {
        $departamento->update(['activo' => false]);

        return new DepartamentoResource($departamento);
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
