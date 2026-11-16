<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Models;

use App\Modules\Inventario\Database\Factories\ProductoFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string|null $tasa_iva
 * @property bool $exento_iva
 */
#[Fillable([
    'tenant_id', 'categoria_id', 'departamento_id', 'nombre', 'descripcion',
    'tasa_iva', 'exento_iva', 'precio_compra', 'precio_venta', 'imagen_url', 'no_resurtible', 'sin_descuento', 'activo',
])]
class Producto extends Model
{
    use BelongsToTenant, SoftDeletes;

    /** @use HasFactory<ProductoFactory> */
    use HasFactory;

    protected $table = 'productos';

    protected function casts(): array
    {
        return [
            'tasa_iva' => 'decimal:4',
            'exento_iva' => 'boolean',
            'precio_compra' => 'decimal:2',
            'precio_venta' => 'decimal:2',
            'no_resurtible' => 'boolean',
            'sin_descuento' => 'boolean',
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

    public function departamento(): BelongsTo
    {
        return $this->belongsTo(Departamento::class);
    }

    public function variantes(): HasMany
    {
        return $this->hasMany(ProductoVariante::class);
    }
}
