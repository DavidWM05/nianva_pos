<?php

namespace App\Modules\Cotizaciones\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Cotizaciones\Http\Requests\ActualizarCotizacionRequest;
use App\Modules\Cotizaciones\Http\Requests\ConvertirCotizacionRequest;
use App\Modules\Cotizaciones\Http\Requests\CrearCotizacionRequest;
use App\Modules\Cotizaciones\Http\Resources\CotizacionResource;
use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Cotizaciones\Services\CotizacionService;
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

    public function store(CrearCotizacionRequest $request, CotizacionService $cotizacionService)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $dto = $request->toDto();

        $cotizacion = $cotizacionService->crear(
            [
                'tenant_id' => (int) $usuario->getAttribute('tenant_id'),
                'sucursal_id' => $dto->sucursalId,
                'usuario_id' => $usuario->id,
                'cliente_id' => $dto->clienteId,
                'validez_dias' => $dto->validezDias,
                'descuento' => $dto->descuento,
                'observaciones' => $dto->observaciones,
                'uso_cfdi' => $dto->usoCfdi,
            ],
            $dto->itemsParaServicio(),
        );

        return (new CotizacionResource($cotizacion))->response()->setStatusCode(201);
    }

    public function show(Cotizacion $cotizacion)
    {
        $cotizacion->load(['cliente', 'usuario', 'detalles.variante.producto']);

        return new CotizacionResource($cotizacion);
    }

    public function update(ActualizarCotizacionRequest $request, int $id, CotizacionService $cotizacionService)
    {
        $dto = $request->toDto();

        $cotizacion = $cotizacionService->actualizar($id, $dto->datosPresentes(), $dto->itemsParaServicio());

        return new CotizacionResource($cotizacion);
    }

    public function destroy(int $id, CotizacionService $cotizacionService)
    {
        $cotizacionService->anular($id);

        return response()->json(['message' => 'Cotización anulada correctamente.']);
    }

    public function convertir(ConvertirCotizacionRequest $request, int $id, CotizacionService $cotizacionService)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $venta = $cotizacionService->convertirAVenta($id, [
            'usuario_id' => $usuario->id,
            'metodo_pago_id' => $request->toDto()->metodoPagoId,
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
