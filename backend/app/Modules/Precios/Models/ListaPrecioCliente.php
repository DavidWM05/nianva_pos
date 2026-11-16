<?php

declare(strict_types=1);

namespace App\Modules\Precios\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Precios\Database\Factories\ListaPrecioClienteFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['tenant_id', 'lista_precio_id', 'cliente_id'])]
class ListaPrecioCliente extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<ListaPrecioClienteFactory> */
    use HasFactory;

    protected $table = 'lista_precio_clientes';

    protected function casts(): array
    {
        return ['cliente_id' => 'integer'];
    }
}
