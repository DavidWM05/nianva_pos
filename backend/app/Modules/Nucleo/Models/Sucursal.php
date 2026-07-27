<?php

namespace App\Modules\Nucleo\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Policies\SucursalPolicy;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'nombre', 'direccion', 'telefono', 'activo'])]
#[UsePolicy(SucursalPolicy::class)]
class Sucursal extends Model
{
    use BelongsToTenant;

    protected $table = 'sucursales';

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function usuarios(): HasMany
    {
        return $this->hasMany(Usuario::class);
    }
}
