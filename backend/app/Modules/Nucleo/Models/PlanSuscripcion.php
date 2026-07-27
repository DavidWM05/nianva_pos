<?php

namespace App\Modules\Nucleo\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'nombre', 'slug', 'limite_usuarios', 'limite_sucursales',
    'precio_mensual', 'precio_anual', 'features', 'activo',
])]
class PlanSuscripcion extends Model
{
    protected $table = 'planes_suscripcion';

    protected function casts(): array
    {
        return [
            'features' => 'array',
            'activo' => 'boolean',
        ];
    }

    public function licencias(): HasMany
    {
        return $this->hasMany(LicenciaLocal::class, 'plan_id');
    }
}
