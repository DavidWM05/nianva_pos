<?php

namespace App\Modules\Precios\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id', 'codigo', 'nombre', 'tipo', 'valor',
    'uso_maximo', 'uso_maximo_por_cliente', 'fecha_inicio', 'fecha_fin', 'activo',
])]
class Cupon extends Model
{
    use BelongsToTenant;

    const UPDATED_AT = null;

    protected $table = 'cupones';

    protected function casts(): array
    {
        return [
            'valor' => 'decimal:2',
            'fecha_inicio' => 'date',
            'fecha_fin' => 'date',
            'activo' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
