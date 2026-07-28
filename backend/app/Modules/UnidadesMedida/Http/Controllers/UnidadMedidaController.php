<?php

namespace App\Modules\UnidadesMedida\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\UnidadesMedida\Http\Resources\UnidadMedidaResource;
use App\Modules\UnidadesMedida\Services\UnidadMedidaService;
use Illuminate\Http\Request;

class UnidadMedidaController extends Controller
{
    private const CAMPOS_ORDENABLES = ['id', 'nombre', 'abreviatura', 'tipo', 'created_at'];

    public function index(Request $request)
    {
        $query = UnidadMedida::where('activo', true);

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
            'data' => UnidadMedidaResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
            ],
        ]);
    }

    public function store(Request $request, UnidadMedidaService $service)
    {
        $validated = $request->validate([
            'nombre' => ['required', 'string', 'max:50'],
            'abreviatura' => ['required', 'string', 'max:10'],
            'tipo' => ['required', 'string', 'in:entero,fraccionario'],
        ]);

        $validated['tenant_id'] = $request->user()->tenant_id;

        $unidad = $service->crear($validated);

        return (new UnidadMedidaResource($unidad))->response()->setStatusCode(201);
    }

    public function update(Request $request, int $id, UnidadMedidaService $service)
    {
        $validated = $request->validate([
            'nombre' => ['sometimes', 'string', 'max:50'],
            'abreviatura' => ['sometimes', 'string', 'max:10'],
            'tipo' => ['sometimes', 'string', 'in:entero,fraccionario'],
            'activo' => ['sometimes', 'boolean'],
        ]);

        $unidad = $service->actualizar($id, $validated);

        return new UnidadMedidaResource($unidad);
    }

    public function destroy(int $id, UnidadMedidaService $service)
    {
        $service->eliminar($id);

        return response()->json(['message' => 'Unidad de medida eliminada correctamente.']);
    }
}
