<?php

namespace App\Modules\Nucleo\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Policies\MetodoPagoPolicy;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'nombre', 'tipo', 'incluir_en_financiero', 'activo'])]
#[UsePolicy(MetodoPagoPolicy::class)]
class MetodoPago extends Model
{
    use BelongsToTenant;

    const CREATED_AT = null;
    const UPDATED_AT = null;

    protected $table = 'metodos_pago';

    protected function casts(): array
    {
        return [
            'incluir_en_financiero' => 'boolean',
            'activo' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
