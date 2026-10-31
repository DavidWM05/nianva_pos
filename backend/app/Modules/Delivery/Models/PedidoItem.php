<?php

namespace App\Modules\Delivery\Models;

use App\Modules\Delivery\Database\Factories\PedidoItemFactory;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['pedido_id', 'variante_id', 'cantidad', 'precio_unitario', 'subtotal'])]
class PedidoItem extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<PedidoItemFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'pedido_items';

    protected function casts(): array
    {
        return [
            'cantidad' => 'integer',
            'precio_unitario' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }

    public static function tenantRelacion(): string
    {
        return 'pedido';
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function variante(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class);
    }
}
