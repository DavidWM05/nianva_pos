<?php

namespace App\Modules\Cotizaciones\Http\Controllers;

use App\Aplicacion\Cotizaciones\ActualizarCotizacion;
use App\Aplicacion\Cotizaciones\AnularCotizacion;
use App\Aplicacion\Cotizaciones\ConvertirCotizacion;
use App\Aplicacion\Cotizaciones\CrearCotizacion;
use App\Http\Controllers\Controller;
use App\Modules\Cotizaciones\Http\Requests\ActualizarCotizacionRequest;
use App\Modules\Cotizaciones\Http\Requests\ConvertirCotizacionRequest;
use App\Modules\Cotizaciones\Http\Requests\CrearCotizacionRequest;
use App\Modules\Cotizaciones\Http\Resources\CotizacionResource;
use App\Modules\Cotizaciones\Models\Cotizacion;
use Illuminate\Http\Request;

/**
 * CRUD de cotizaciones/presupuestos.
 *
 * store()/actualizar() nunca calculan precios — se reciben del frontend
 * (que los obtuvo via GET /api/producto-variantes/{id}/precio o similares).
 * La conversión se orquesta en la Action ConvertirCotizacion.
 */
class CotizacionController extends Controller
{
    private const CAMPOS_ORDENABLES = ['id', 'total', 'created_at', 'fecha_vencimiento'];

    public function index(Request $request)
    {
        $query = Cotizacion::query()->with(['cliente:id,ulid,nombre']);

        if ($estado = $request->query('filtro_estado')) {
            $query->where('estado', $estado);
        }

        if ($clienteId = $request->query('filtro_cliente_id')) {
            // DAT-08: el filtro recibe el ulid publicado del cliente.
            $query->whereHas('cliente', fn ($q) => $q->where('ulid', strtolower((string) $clienteId)));
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
                'permisos' => $this->permisosDe($request, 'cotizaciones', ['ver', 'crear', 'editar', 'eliminar', 'convertir', 'precio_manual']),
            ],
        ]);
    }

    public function store(CrearCotizacionRequest $request, CrearCotizacion $action)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $dto = $request->toDto();

        $cotizacion = $action->ejecutar($dto, $usuario);

        return (new CotizacionResource($cotizacion))->response()->setStatusCode(201);
    }

    public function show(Request $request, Cotizacion $cotizacion)
    {
        $cotizacion->load(['cliente', 'usuario', 'detalles.variante.producto']);

        return response()->json([
            'data' => new CotizacionResource($cotizacion),
            'meta' => [
                'permisos' => $this->permisosDe(
                    $request,
                    'cotizaciones',
                    ['ver', 'crear', 'editar', 'eliminar', 'convertir', 'precio_manual'],
                ),
            ],
        ]);
    }

    /**
     * DAT-08: las rutas de la cotización la resuelven por ulid (binding); las Actions siguen
     * recibiendo el id interno y bloqueando por él.
     */
    public function update(ActualizarCotizacionRequest $request, Cotizacion $cotizacion, ActualizarCotizacion $action)
    {
        $dto = $request->toDto();

        $cotizacion = $action->ejecutar($dto, (int) $cotizacion->getKey());

        return new CotizacionResource($cotizacion);
    }

    public function destroy(Cotizacion $cotizacion, AnularCotizacion $action)
    {
        $action->ejecutar((int) $cotizacion->getKey());

        return response()->json(['message' => 'Cotización anulada correctamente.']);
    }

    public function convertir(ConvertirCotizacionRequest $request, Cotizacion $cotizacion, ConvertirCotizacion $action)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $venta = $action->ejecutar($request->toDto(), (int) $cotizacion->getKey(), $usuario);

        return response()->json([
            'message' => 'Cotización convertida a venta correctamente.',
            // DAT-08: la venta creada se publica por su ulid.
            'venta_id' => (string) $venta->getAttribute('ulid'),
        ]);
    }

    /**
     * Un booleano por acción: el OpenAPI lo documenta como objeto, no como lista.
     *
     * @param  list<string>  $acciones
     * @return array<string, bool>
     */
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
