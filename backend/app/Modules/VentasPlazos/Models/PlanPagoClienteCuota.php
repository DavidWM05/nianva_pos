<?php

namespace App\Modules\VentasPlazos\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\VentasPlazos\Database\Factories\PlanPagoClienteCuotaFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Sin tenant_id propio: el aislamiento se resuelve via BelongsToTenantViaRelacion
 * consultando planPagoCliente.tenant_id (ver tenantRelacion()).
 */
#[Fillable([
    'plan_pago_cliente_id', 'numero_cuota', 'monto', 'monto_capital',
    'monto_interes', 'fecha_vencimiento', 'fecha_pago', 'fecha_pago_real', 'estado',
])]
class PlanPagoClienteCuota extends Model
{
    use BelongsToTenantViaRelacion;

    /** @use HasFactory<PlanPagoClienteCuotaFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $table = 'planes_pago_cliente_cuotas';

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
            'monto_capital' => 'decimal:2',
            'monto_interes' => 'decimal:2',
            'fecha_vencimiento' => 'date',
            'fecha_pago' => 'datetime',
            'fecha_pago_real' => 'datetime',
        ];
    }

    public static function tenantRelacion(): string
    {
        return 'planPagoCliente';
    }

    public function planPagoCliente(): BelongsTo
    {
        return $this->belongsTo(PlanPagoCliente::class, 'plan_pago_cliente_id');
    }
}
