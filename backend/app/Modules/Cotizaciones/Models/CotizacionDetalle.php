<?php

namespace App\Modules\Cotizaciones\Models;

use App\Modules\Cotizaciones\Database\Factories\CotizacionDetalleFactory;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['cotizacion_id', 'variante_id', 'cantidad', 'precio_unitario', 'descuento', 'subtotal'])]
class CotizacionDetalle extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<CotizacionDetalleFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'cotizacion_detalles';

    protected function casts(): array
    {
        return [
            'cantidad' => 'integer',
            'precio_unitario' => 'decimal:2',
            'descuento' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }

    public static function tenantRelacion(): string
    {
        return 'cotizacion';
    }

    public function cotizacion(): BelongsTo
    {
        return $this->belongsTo(Cotizacion::class);
    }

    public function variante(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class);
    }
}
