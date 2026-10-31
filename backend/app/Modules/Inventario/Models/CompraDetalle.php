<?php

namespace App\Modules\Inventario\Models;

use App\Modules\Inventario\Database\Factories\CompraDetalleFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Sin tenant_id propio: el aislamiento se resuelve via BelongsToTenantViaRelacion
 * consultando compra.tenant_id (ver tenantRelacion()).
 */
#[Fillable(['compra_id', 'variante_id', 'cantidad', 'precio_compra', 'subtotal'])]
class CompraDetalle extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<CompraDetalleFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'compra_detalles';

    protected function casts(): array
    {
        return [
            'precio_compra' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }

    public static function tenantRelacion(): string
    {
        return 'compra';
    }

    public function compra(): BelongsTo
    {
        return $this->belongsTo(Compra::class);
    }

    public function variante(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class, 'variante_id');
    }
}
