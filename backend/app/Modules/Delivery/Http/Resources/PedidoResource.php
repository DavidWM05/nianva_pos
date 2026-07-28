<?php

namespace App\Modules\Delivery\Http\Resources;

use App\Modules\Delivery\Models\Pedido;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Pedido */
class PedidoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'numero_pedido' => $this->numero_pedido,
            'cliente' => $this->whenLoaded('cliente', fn () => ['id' => $this->cliente->id, 'nombre' => $this->cliente->nombre]),
            'repartidor' => $this->whenLoaded('repartidor', fn () => ['id' => $this->repartidor->id, 'nombre' => $this->repartidor->nombre]),
            'referencia' => $this->referencia,
            'direccion_entrega' => $this->direccion_entrega,
            'costo_delivery' => $this->costo_delivery,
            'estado' => $this->estado,
            'tiempo_estimado' => $this->tiempo_estimado,
            'notas' => $this->notas,
            'fecha_entrega' => $this->fecha_entrega,
            'items' => PedidoItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
        ];
    }
}
