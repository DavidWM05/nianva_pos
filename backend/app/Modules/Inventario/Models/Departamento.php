<?php

namespace App\Modules\Inventario\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'nombre', 'descripcion', 'activo'])]
class Departamento extends Model
{
    use BelongsToTenant;

    const UPDATED_AT = null;

    protected $table = 'departamentos';

    protected function casts(): array
    {
        return ['activo' => 'boolean'];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function productos(): HasMany
    {
        return $this->hasMany(Producto::class);
    }
}
