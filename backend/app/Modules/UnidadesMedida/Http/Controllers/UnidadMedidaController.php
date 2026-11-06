<?php

namespace App\Modules\UnidadesMedida\Http\Controllers;

use App\Aplicacion\UnidadesMedida\ActualizarUnidadMedida;
use App\Aplicacion\UnidadesMedida\CrearUnidadMedida;
use App\Aplicacion\UnidadesMedida\EliminarUnidadMedida;
use App\Http\Controllers\Controller;
use App\Modules\UnidadesMedida\Http\Requests\GuardarUnidadMedidaRequest;
use App\Modules\UnidadesMedida\Http\Resources\UnidadMedidaResource;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
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

    public function store(GuardarUnidadMedidaRequest $request, CrearUnidadMedida $action)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $unidad = $action->ejecutar($request->toDto(), (int) $usuario->getAttribute('tenant_id'));

        return (new UnidadMedidaResource($unidad))->response()->setStatusCode(201);
    }

    public function update(GuardarUnidadMedidaRequest $request, int $id, ActualizarUnidadMedida $action)
    {
        $unidad = $action->ejecutar($request->toDto(), $id);

        return new UnidadMedidaResource($unidad);
    }

    public function destroy(int $id, EliminarUnidadMedida $action)
    {
        $action->ejecutar($id);

        return response()->json(['message' => 'Unidad de medida eliminada correctamente.']);
    }
}
