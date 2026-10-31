<?php

namespace App\Modules\Inventario\Models;

use App\Modules\Inventario\Database\Factories\DepartamentoFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'nombre', 'descripcion', 'activo'])]
class Departamento extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<DepartamentoFactory> */
    use HasFactory;

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
