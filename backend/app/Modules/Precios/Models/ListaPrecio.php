<?php

declare(strict_types=1);

namespace App\Modules\Precios\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Precios\Database\Factories\ListaPrecioFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'nombre', 'activo'])]
class ListaPrecio extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<ListaPrecioFactory> */
    use HasFactory;

    protected $table = 'listas_precio';

    /** @return HasMany<ListaPrecioItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(ListaPrecioItem::class, 'lista_precio_id')->orderBy('id');
    }

    /** @return HasMany<ListaPrecioCliente, $this> */
    public function clientes(): HasMany
    {
        return $this->hasMany(ListaPrecioCliente::class, 'lista_precio_id')->orderBy('id');
    }

    protected function casts(): array
    {
        return ['activo' => 'boolean'];
    }
}
