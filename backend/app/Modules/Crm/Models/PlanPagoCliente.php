<?php

namespace App\Modules\Crm\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'cliente_id', 'concepto', 'monto_total', 'fecha_inicio'])]
class PlanPagoCliente extends Model
{
    use BelongsToTenant;

    const UPDATED_AT = null;

    protected $table = 'planes_pago_cliente';

    protected function casts(): array
    {
        return [
            'monto_total' => 'decimal:2',
            'fecha_inicio' => 'date',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function cuotas(): HasMany
    {
        return $this->hasMany(PlanPagoClienteCuota::class);
    }
}
