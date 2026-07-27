<?php

namespace App\Modules\Inventario\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Sucursal;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Unica fuente de verdad del stock (una fila por sucursal+variante). Sin
 * tenant_id propio: el aislamiento se resuelve via BelongsToTenantViaRelacion
 * consultando sucursal.tenant_id (ver tenantRelacion()).
 *
 * NUNCA escribir stock_actual directamente -- usar siempre
 * InventarioService::registrarMovimiento(), que actualiza esta tabla y
 * kardex en una sola transaccion atomica.
 */
#[Fillable(['sucursal_id', 'variante_id', 'stock_actual', 'stock_minimo'])]
class InventarioStock extends Model
{
    use BelongsToTenantViaRelacion;

    const CREATED_AT = null;

    protected $table = 'inventario_stock';

    public static function tenantRelacion(): string
    {
        return 'sucursal';
    }

    public function sucursal(): BelongsTo
    {
        return $this->belongsTo(Sucursal::class);
    }

    public function variante(): BelongsTo
    {
        return $this->belongsTo(ProductoVariante::class, 'variante_id');
    }
}
