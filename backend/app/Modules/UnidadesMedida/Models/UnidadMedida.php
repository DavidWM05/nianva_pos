<?php

namespace App\Modules\UnidadesMedida\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'nombre', 'abreviatura', 'tipo', 'activo'])]
class UnidadMedida extends Model
{
    use BelongsToTenant;

    protected $table = 'unidades_medida';

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function esGlobal(): bool
    {
        return $this->tenant_id === null;
    }
}
