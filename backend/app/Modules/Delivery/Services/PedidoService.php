<?php

namespace App\Modules\Delivery\Services;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Delivery\Exceptions\PedidoNoAsignableException;
use App\Modules\Delivery\Exceptions\TransicionEstadoInvalidaException;
use App\Modules\Delivery\Models\Pedido;
use App\Modules\Delivery\Models\PedidoItem;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PedidoService
{
    private const TRANSICIONES = [
        'pendiente' => ['preparando', 'cancelado'],
        'preparando' => ['en_camino', 'cancelado'],
        'en_camino' => ['entregado', 'cancelado'],
        'entregado' => [],
        'cancelado' => [],
    ];

    public function __construct(
        private readonly VentaService $ventaService,
    ) {}

    public function crear(array $data, array $items = []): Pedido
    {
        return DB::transaction(function () use ($data, $items) {
            $tenantId = $data['tenant_id'];
            $numeroPedido = $this->generarNumeroPedido($tenantId);

            $pedido = Pedido::create([
                'tenant_id' => $tenantId,
                'sucursal_id' => $data['sucursal_id'],
                'cliente_id' => $data['cliente_id'],
                'usuario_id' => $data['usuario_id'],
                'numero_pedido' => $numeroPedido,
                'direccion_entrega' => $data['direccion_entrega'] ?? null,
                'referencia' => $data['referencia'] ?? null,
                'costo_delivery' => round((float) ($data['costo_delivery'] ?? 0), 2),
                'tiempo_estimado' => $data['tiempo_estimado'] ?? null,
                'notas' => $data['notas'] ?? null,
                'estado' => 'pendiente',
            ]);

            foreach ($items as $item) {
                $variante = ProductoVariante::sinTenant()->with('producto')->findOrFail($item['variante_id']);

                if ($variante->producto->tenant_id !== $tenantId) {
                    throw new InvalidArgumentException("La variante {$item['variante_id']} no pertenece al tenant.");
                }

                $precio = round((float) ($item['precio_unitario'] ?? 0), 2);
                $subtotal = round($precio * $item['cantidad'], 2);

                PedidoItem::create([
                    'pedido_id' => $pedido->id,
                    'variante_id' => $variante->id,
                    'cantidad' => $item['cantidad'],
                    'precio_unitario' => $precio,
                    'subtotal' => $subtotal,
                ]);
            }

            return $pedido->load('items');
        });
    }

    public function cambiarEstado(int $id, string $nuevoEstado): Pedido
    {
        return DB::transaction(function () use ($id, $nuevoEstado) {
            $pedido = Pedido::where('id', $id)->lockForUpdate()->firstOrFail();

            $permitidas = self::TRANSICIONES[$pedido->estado] ?? [];

            if (! in_array($nuevoEstado, $permitidas, true)) {
                throw new TransicionEstadoInvalidaException($pedido->estado, $nuevoEstado);
            }

            $update = ['estado' => $nuevoEstado];

            if ($nuevoEstado === 'entregado') {
                $update['fecha_entrega'] = now();
            }

            $pedido->update($update);

            return $pedido->fresh();
        });
    }

    public function asignarRepartidor(int $id, int $repartidorId): Pedido
    {
        return DB::transaction(function () use ($id, $repartidorId) {
            $pedido = Pedido::where('id', $id)->lockForUpdate()->firstOrFail();

            if (in_array($pedido->estado, ['entregado', 'cancelado'], true)) {
                throw new PedidoNoAsignableException($pedido->id, $pedido->estado);
            }

            $repartidor = Usuario::findOrFail($repartidorId);

            $pedido->update(['repartidor_id' => $repartidor->id]);

            return $pedido->fresh();
        });
    }

    private function generarNumeroPedido(int $tenantId): string
    {
        $ultimo = Pedido::sinTenant()
            ->where('tenant_id', $tenantId)
            ->where('numero_pedido', 'like', 'PED-%')
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        $correlativo = 1;
        if ($ultimo) {
            $partes = explode('-', $ultimo->numero_pedido);
            $correlativo = ((int) end($partes)) + 1;
        }

        return 'PED-' . str_pad((string) $correlativo, 6, '0', STR_PAD_LEFT);
    }
}
