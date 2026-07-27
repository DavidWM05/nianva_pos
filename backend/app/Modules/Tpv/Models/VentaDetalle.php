<?php

namespace App\Modules\Tpv\Models;

use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Precios\Models\ReglaPrecio;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Sin tenant_id propio: el aislamiento se resuelve via BelongsToTenantViaRelacion
 * consultando venta.tenant_id (ver tenantRelacion()).
 */
#[Fillable(['venta_id', 'variante_id', 'regla_precio_id', 'cantidad', 'precio_unitario', 'descuento_aplicado', 'subtotal'])]
class VentaDetalle extends Model
{
    use BelongsToTenantViaRelacion;

    public $timestamps = false;

    protected $table = 'venta_detalles';

    protected function casts(): array
    {
        return [
            'precio_unitario' => 'decimal:2',
            'descuento_aplicado' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }

    public static function tenantRelacion(): string
    {
        return 'venta';
    }

    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class);
    }

    public function variante(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class, 'variante_id');
    }

    public function reglaPrecio(): BelongsTo
    {
        return $this->belongsTo(ReglaPrecio::class, 'regla_precio_id');
    }
}
