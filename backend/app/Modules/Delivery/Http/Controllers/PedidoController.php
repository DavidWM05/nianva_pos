<?php

namespace App\Modules\Delivery\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Delivery\Http\Requests\AsignarRepartidorRequest;
use App\Modules\Delivery\Http\Requests\CambiarEstadoPedidoRequest;
use App\Modules\Delivery\Http\Requests\CrearPedidoRequest;
use App\Modules\Delivery\Http\Resources\PedidoResource;
use App\Modules\Delivery\Models\Pedido;
use App\Modules\Delivery\Services\PedidoService;
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

    public function store(CrearPedidoRequest $request, PedidoService $service)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $dto = $request->toDto();

        $pedido = $service->crear(
            [
                'tenant_id' => (int) $usuario->getAttribute('tenant_id'),
                'sucursal_id' => $dto->sucursalId,
                'usuario_id' => $usuario->id,
                'cliente_id' => $dto->clienteId,
                'direccion_entrega' => $dto->direccionEntrega,
                'referencia' => $dto->referencia,
                'costo_delivery' => $dto->costoDelivery ?? 0,
                'tiempo_estimado' => $dto->tiempoEstimado,
                'notas' => $dto->notas,
            ],
            $dto->itemsParaServicio(),
        );

        return (new PedidoResource($pedido))->response()->setStatusCode(201);
    }

    public function show(Pedido $pedido)
    {
        $pedido->load(['cliente', 'repartidor', 'items']);

        return new PedidoResource($pedido);
    }

    public function cambiarEstado(CambiarEstadoPedidoRequest $request, int $id, PedidoService $service)
    {
        $pedido = $service->cambiarEstado($id, $request->toDto()->estado);

        return new PedidoResource($pedido);
    }

    public function asignarRepartidor(AsignarRepartidorRequest $request, int $id, PedidoService $service)
    {
        $pedido = $service->asignarRepartidor($id, $request->toDto()->repartidorId);

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
