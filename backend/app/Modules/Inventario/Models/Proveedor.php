<?php

namespace App\Modules\Inventario\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'razon_social', 'rfc', 'telefono', 'correo', 'direccion', 'activo'])]
class Proveedor extends Model
{
    use BelongsToTenant;

    const UPDATED_AT = null;

    protected $table = 'proveedores';

    protected function casts(): array
    {
        return ['activo' => 'boolean'];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function compras(): HasMany
    {
        return $this->hasMany(Compra::class);
    }
}
