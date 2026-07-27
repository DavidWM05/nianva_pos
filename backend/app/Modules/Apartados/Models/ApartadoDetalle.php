<?php

namespace App\Modules\Apartados\Models;

use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Sin tenant_id propio: el aislamiento se resuelve via BelongsToTenantViaRelacion
 * consultando apartado.tenant_id (ver tenantRelacion()).
 */
#[Fillable(['apartado_id', 'variante_id', 'cantidad', 'precio_unitario', 'subtotal'])]
class ApartadoDetalle extends Model
{
    use BelongsToTenantViaRelacion;

    public $timestamps = false;

    protected $table = 'apartado_detalles';

    protected function casts(): array
    {
        return [
            'precio_unitario' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }

    public static function tenantRelacion(): string
    {
        return 'apartado';
    }

    public function apartado(): BelongsTo
    {
        return $this->belongsTo(Apartado::class);
    }

    public function variante(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class, 'variante_id');
    }
}
