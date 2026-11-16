<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Models;

use App\Modules\Inventario\Database\Factories\PresentacionFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['tenant_id', 'variante_id', 'nombre', 'factor', 'codigo_barras', 'precio_venta'])]
class Presentacion extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<PresentacionFactory> */
    use HasFactory;

    protected $table = 'presentaciones';

    protected $attributes = ['codigo_barras' => null, 'precio_venta' => null];

    protected function casts(): array
    {
        return ['factor' => 'decimal:3', 'precio_venta' => 'decimal:2'];
    }
}
