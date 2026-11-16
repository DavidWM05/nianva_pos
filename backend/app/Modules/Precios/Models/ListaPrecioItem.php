<?php

declare(strict_types=1);

namespace App\Modules\Precios\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Precios\Database\Factories\ListaPrecioItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['tenant_id', 'lista_precio_id', 'producto_id', 'variante_id', 'precio'])]
class ListaPrecioItem extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<ListaPrecioItemFactory> */
    use HasFactory;

    protected $table = 'lista_precio_items';

    protected function casts(): array
    {
        return ['precio' => 'decimal:2'];
    }

    protected static function booted(): void
    {
        static::saving(function (self $item): void {
            if (($item->getAttribute('producto_id') === null) === ($item->getAttribute('variante_id') === null)) {
                throw new \InvalidArgumentException('El precio de lista requiere exactamente un producto o una variante.');
            }
        });
    }
}
