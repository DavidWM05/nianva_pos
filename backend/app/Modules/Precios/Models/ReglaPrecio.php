<?php

namespace App\Modules\Precios\Models;

use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id', 'nombre', 'tipo', 'valor', 'cantidad_compra', 'cantidad_paga',
    'precio_bundle', 'aplica_a', 'categoria_id', 'producto_id', 'variante_id',
    'fecha_inicio', 'fecha_fin', 'activo',
])]
class ReglaPrecio extends Model
{
    use BelongsToTenant;

    const UPDATED_AT = null;

    protected $table = 'reglas_precio';

    protected function casts(): array
    {
        return [
            'valor' => 'decimal:2',
            'precio_bundle' => 'decimal:2',
            'fecha_inicio' => 'date',
            'fecha_fin' => 'date',
            'activo' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class);
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    public function variante(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class, 'variante_id');
    }
}
