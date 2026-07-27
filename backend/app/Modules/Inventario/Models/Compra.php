<?php

namespace App\Modules\Inventario\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'proveedor_id', 'sucursal_id', 'usuario_id',
    'numero_comprobante', 'comprobante_url', 'total',
])]
class Compra extends Model
{
    use BelongsToTenant;

    const CREATED_AT = 'fecha';

    const UPDATED_AT = null;

    protected $table = 'compras';

    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
            'fecha' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class);
    }

    public function sucursal(): BelongsTo
    {
        return $this->belongsTo(Sucursal::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(CompraDetalle::class);
    }
}
