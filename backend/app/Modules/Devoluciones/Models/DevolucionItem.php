<?php

namespace App\Modules\Devoluciones\Models;

use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Sin tenant_id propio: el aislamiento se resuelve via BelongsToTenantViaRelacion
 * consultando devolucion.tenant_id (ver tenantRelacion()). tipo='devuelto'
 * o 'nuevo' distingue las lineas que regresan de las que se entregan en un
 * cambio -- ambas viven en la misma tabla porque ambas describen la misma
 * transaccion de devolucion/cambio.
 */
#[Fillable(['devolucion_id', 'variante_id', 'tipo', 'cantidad', 'precio_unitario', 'subtotal', 'va_a_merma'])]
class DevolucionItem extends Model
{
    use BelongsToTenantViaRelacion;

    public $timestamps = false;

    protected $table = 'devolucion_items';

    protected function casts(): array
    {
        return [
            'precio_unitario' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'va_a_merma' => 'boolean',
        ];
    }

    public static function tenantRelacion(): string
    {
        return 'devolucion';
    }

    public function devolucion(): BelongsTo
    {
        return $this->belongsTo(Devolucion::class);
    }

    public function variante(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class, 'variante_id');
    }
}
