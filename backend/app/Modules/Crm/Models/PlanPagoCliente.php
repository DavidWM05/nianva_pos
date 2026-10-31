<?php

namespace App\Modules\Crm\Models;

use App\Modules\Crm\Database\Factories\PlanPagoClienteFactory;
use App\Modules\Nucleo\Models\Concerns\BelongsToTenant;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'cliente_id', 'venta_id', 'concepto', 'monto_total',
    'interes_total', 'tasa_interes', 'numero_cuotas', 'periodicidad', 'fecha_inicio',
])]
class PlanPagoCliente extends Model
{
    use BelongsToTenant;

    /** @use HasFactory<PlanPagoClienteFactory> */
    use HasFactory;

    const UPDATED_AT = null;

    protected $table = 'planes_pago_cliente';

    protected function casts(): array
    {
        return [
            'monto_total' => 'decimal:2',
            'interes_total' => 'decimal:2',
            'tasa_interes' => 'decimal:2',
            'numero_cuotas' => 'integer',
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

    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class);
    }

    public function cuotas(): HasMany
    {
        return $this->hasMany(PlanPagoClienteCuota::class);
    }
}
