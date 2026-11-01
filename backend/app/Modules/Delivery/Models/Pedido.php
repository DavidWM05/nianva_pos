<?php

namespace App\Modules\Delivery\Models;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Delivery\Database\Factories\PedidoFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToSucursal;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'sucursal_id', 'venta_id', 'cliente_id', 'usuario_id', 'repartidor_id',
    'numero_pedido', 'direccion_entrega', 'referencia', 'costo_delivery',
    'estado', 'tiempo_estimado', 'notas', 'fecha_entrega',
])]
class Pedido extends Model
{
    use BelongsToSucursal;
    use BelongsToTenant;

    /** @use HasFactory<PedidoFactory> */
    use HasFactory;

    protected $table = 'pedidos';

    protected function casts(): array
    {
        return [
            'costo_delivery' => 'decimal:2',
            'tiempo_estimado' => 'integer',
            'fecha_entrega' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function sucursal(): BelongsTo
    {
        return $this->belongsTo(Sucursal::class);
    }

    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class);
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    public function repartidor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'repartidor_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PedidoItem::class);
    }
}
