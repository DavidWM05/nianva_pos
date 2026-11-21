<?php

namespace App\Modules\VentasPlazos\Models;

use App\Modules\Nucleo\Models\Concerns\BelongsToTenantViaRelacion;
use App\Modules\Nucleo\Models\Concerns\SerializaDecimales;
use App\Modules\Nucleo\Models\Concerns\TieneUlid;
use App\Modules\VentasPlazos\Database\Factories\PlanPagoClienteCuotaFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Sin tenant_id propio: el aislamiento se resuelve via BelongsToTenantViaRelacion
 * consultando planPagoCliente.tenant_id (ver tenantRelacion()).
 *
 * @property int $id
 * @property int $numero_cuota
 * @property string $monto
 * @property string $monto_capital
 * @property string $monto_interes
 * @property Carbon $fecha_vencimiento
 * @property Carbon|null $fecha_pago
 * @property 'pendiente'|'pagada'|'vencida' $estado
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

    use SerializaDecimales;
    use TieneUlid;

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
