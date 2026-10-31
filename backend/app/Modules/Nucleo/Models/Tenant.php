<?php

namespace App\Modules\Nucleo\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['nombre', 'razon_social', 'rfc', 'telefono', 'correo', 'direccion', 'pais', 'activo'])]
class Tenant extends Model
{
    use SoftDeletes;

    protected $table = 'tenants';

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
        ];
    }

    public function sucursales(): HasMany
    {
        return $this->hasMany(Sucursal::class);
    }

    public function usuarios(): HasMany
    {
        return $this->hasMany(Usuario::class);
    }

    public function roles(): HasMany
    {
        return $this->hasMany(Rol::class);
    }

    public function licencias(): HasMany
    {
        return $this->hasMany(LicenciaLocal::class);
    }

    public function metodosPago(): HasMany
    {
        return $this->hasMany(MetodoPago::class);
    }
}
