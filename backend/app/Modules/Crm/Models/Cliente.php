<?php

namespace App\Modules\Crm\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'nombre', 'documento_fiscal', 'telefono', 'correo', 'direccion', 'activo', 'es_sistema'])]
class Cliente extends Model
{
    use BelongsToTenant;

    const CREATED_AT = 'fecha_registro';

    const UPDATED_AT = null;

    protected $table = 'clientes';

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'es_sistema' => 'boolean',
            'fecha_registro' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function planesPago(): HasMany
    {
        return $this->hasMany(PlanPagoCliente::class);
    }
}
