<?php

namespace App\Modules\Inventario\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use InvalidArgumentException;

/**
 * Conserva BelongsToTenantViaRelacion para las consultas (el scope sigue
 * resolviendose via producto.tenant_id). tenant_id se copia del producto al
 * crear la variante y sirve para el UNIQUE(tenant_id, codigo_barras).
 */
#[Fillable(['tenant_id', 'producto_id', 'talla', 'color', 'codigo_barras', 'activo', 'unidad_medida_id'])]
class ProductoVariante extends Model
{
    use BelongsToTenantViaRelacion;

    const UPDATED_AT = null;

    protected $table = 'producto_variantes';

    protected function casts(): array
    {
        return ['activo' => 'boolean'];
    }

    protected static function booted(): void
    {
        static::creating(function (self $variante): void {
            $producto = Producto::sinTenant()->find($variante->producto_id);

            if ($producto === null) {
                throw new InvalidArgumentException("El producto {$variante->producto_id} no existe.");
            }

            if ($variante->tenant_id === null) {
                $variante->tenant_id = $producto->tenant_id;

                return;
            }

            if ((int) $variante->tenant_id !== (int) $producto->tenant_id) {
                throw new InvalidArgumentException(
                    "La variante y el producto {$producto->id} pertenecen a tenants distintos."
                );
            }
        });
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
