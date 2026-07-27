<?php

namespace App\Modules\Crm\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Sin tenant_id propio: el aislamiento se resuelve via BelongsToTenantViaRelacion
 * consultando planPagoCliente.tenant_id (ver tenantRelacion()).
 */
#[Fillable(['plan_pago_cliente_id', 'numero_cuota', 'monto', 'fecha_vencimiento', 'fecha_pago', 'estado'])]
class PlanPagoClienteCuota extends Model
{
    use BelongsToTenantViaRelacion;

    public $timestamps = false;

    protected $table = 'planes_pago_cliente_cuotas';

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
            'fecha_vencimiento' => 'date',
            'fecha_pago' => 'datetime',
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
