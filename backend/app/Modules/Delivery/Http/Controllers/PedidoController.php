<?php

namespace App\Modules\Delivery\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Delivery\Http\Resources\PedidoResource;
use App\Modules\Delivery\Models\Pedido;
use App\Modules\Delivery\Services\PedidoService;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Http\Request;

class PedidoController extends Controller
{
    private const CAMPOS_ORDENABLES = ['id', 'created_at', 'costo_delivery'];

    public function index(Request $request)
    {
        $query = Pedido::query()->with(['cliente:id,nombre', 'repartidor:id,nombre']);

        if ($estado = $request->query('filtro_estado')) {
            $query->where('estado', $estado);
        }

        if ($repartidorId = $request->query('filtro_repartidor_id')) {
            $query->where('repartidor_id', $repartidorId);
        }

        if ($clienteId = $request->query('filtro_cliente_id')) {
            $query->where('cliente_id', $clienteId);
        }

        if ($numero = $request->query('filtro_numero_pedido')) {
            $query->where('numero_pedido', 'like', "%{$numero}%");
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
            'data' => PedidoResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request, 'pedidos', ['ver', 'crear', 'cambiar_estado', 'asignar_repartidor']),
            ],
        ]);
    }

    public function store(Request $request, PedidoService $service)
    {
        $validated = $request->validate([
            'cliente_id' => ['required', 'integer', 'exists:clientes,id'],
            'sucursal_id' => ['required', 'integer', 'exists:sucursales,id'],
            'direccion_entrega' => ['nullable', 'string', 'max:500'],
            'referencia' => ['nullable', 'string', 'max:255'],
            'costo_delivery' => ['nullable', 'numeric', 'min:0'],
            'tiempo_estimado' => ['nullable', 'integer', 'min:1'],
            'notas' => ['nullable', 'string', 'max:1000'],
            'items' => ['nullable', 'array'],
            'items.*.variante_id' => ['required_with:items', 'integer', 'exists:producto_variantes,id'],
            'items.*.cantidad' => ['required_with:items', 'integer', 'min:1'],
            'items.*.precio_unitario' => ['required_with:items', 'numeric', 'min:0'],
        ]);

        $usuario = $request->user();
        $tenantId = app(TenantContext::class)->id();

        $pedido = $service->crear(
            [
                'tenant_id' => $tenantId,
                'sucursal_id' => $validated['sucursal_id'],
                'usuario_id' => $usuario->id,
                'cliente_id' => $validated['cliente_id'],
                'direccion_entrega' => $validated['direccion_entrega'] ?? null,
                'referencia' => $validated['referencia'] ?? null,
                'costo_delivery' => $validated['costo_delivery'] ?? 0,
                'tiempo_estimado' => $validated['tiempo_estimado'] ?? null,
                'notas' => $validated['notas'] ?? null,
            ],
            $validated['items'] ?? [],
        );

        return (new PedidoResource($pedido))->response()->setStatusCode(201);
    }

    public function show(Pedido $pedido)
    {
        $pedido->load(['cliente', 'repartidor', 'items']);

        return new PedidoResource($pedido);
    }

    public function cambiarEstado(Request $request, int $id, PedidoService $service)
    {
        $validated = $request->validate([
            'estado' => ['required', 'string', 'in:pendiente,preparando,en_camino,entregado,cancelado'],
        ]);

        $pedido = $service->cambiarEstado($id, $validated['estado']);

        return new PedidoResource($pedido);
    }

    public function asignarRepartidor(Request $request, int $id, PedidoService $service)
    {
        $validated = $request->validate([
            'repartidor_id' => ['required', 'integer', 'exists:usuarios,id'],
        ]);

        $pedido = $service->asignarRepartidor($id, $validated['repartidor_id']);

        return new PedidoResource($pedido);
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
