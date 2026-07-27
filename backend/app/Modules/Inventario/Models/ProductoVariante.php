<?php

namespace App\Modules\Inventario\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Sin tenant_id propio: el aislamiento se resuelve via BelongsToTenantViaRelacion
 * consultando producto.tenant_id (ver tenantRelacion()).
 */
#[Fillable(['producto_id', 'talla', 'color', 'codigo_barras', 'activo'])]
class ProductoVariante extends Model
{
    use BelongsToTenantViaRelacion;

    const UPDATED_AT = null;

    protected $table = 'producto_variantes';

    protected function casts(): array
    {
        return ['activo' => 'boolean'];
    }

    public static function tenantRelacion(): string
    {
        return 'producto';
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    public function stock(): HasMany
    {
        return $this->hasMany(InventarioStock::class, 'variante_id');
    }

    public function kardex(): HasMany
    {
        return $this->hasMany(Kardex::class, 'variante_id');
    }
}
