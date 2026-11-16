<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Models;

use App\Modules\Inventario\Database\Factories\ProductoVarianteFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use InvalidArgumentException;

/**
 * @property string|null $precio_venta
 * @property string|null $costo
 *
 * Conserva BelongsToTenantViaRelacion para las consultas (el scope sigue
 * resolviendose via producto.tenant_id). tenant_id se copia del producto al
 * crear la variante y sirve para el UNIQUE(tenant_id, codigo_barras).
 */
#[Fillable(['tenant_id', 'producto_id', 'talla', 'color', 'codigo_barras', 'activo', 'unidad_medida_id', 'es_granel', 'precio_venta', 'costo'])]
class ProductoVariante extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<ProductoVarianteFactory> */
    use HasFactory;

    const UPDATED_AT = null;

    protected $table = 'producto_variantes';

    protected $attributes = ['precio_venta' => null, 'costo' => null];

    protected $hidden = ['es_granel'];

    protected function casts(): array
    {
        return ['activo' => 'boolean', 'es_granel' => 'boolean', 'precio_venta' => 'decimal:2', 'costo' => 'decimal:2'];
    }

    protected static function booted(): void
    {
        static::creating(function (self $variante): void {
            $producto = Producto::sinTenant()->whereKey($variante->producto_id)->first();

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
